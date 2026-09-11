/** @jest-environment node */

import { spawnSync } from 'child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { load } from 'js-yaml'

type Step = {
  name: string
  id?: string
  run?: string
  uses?: string
  if?: string
  'continue-on-error'?: boolean
  with?: Record<string, string | number>
}

type Workflow = {
  jobs: Record<
    string,
    {
      'continue-on-error'?: boolean
      needs?: string
      uses?: string
      steps: Step[]
    }
  >
}

const workflow = load(
  readFileSync(resolve('.github/workflows/scan-ecr-image.yml'), 'utf8')
) as Workflow
const pollJob = workflow.jobs['wait-for-inspector2-scan']
const reportJob = workflow.jobs['scan-report']

function stepScript(steps: Step[], name: string): string {
  const step = steps.find((candidate) => candidate.name === name)
  if (!step?.run) throw new Error(`Missing shell step: ${name}`)
  return step.run
}

const metadata = stepScript(
  pollJob.steps,
  'Validate scan configuration and compute metadata'
)
const poll = stepScript(pollJob.steps, 'Wait for the Inspector2 image scan')
const generate = stepScript(reportJob.steps, 'Generate ECR scan report')
const requireReports = stepScript(
  reportJob.steps,
  'Require complete scan reports'
)

// Only AWS and time are mocked. Execute the actual workflow shell and real jq.
const pollMocks = `
aws() {
  printf '%s\\n' "$2" >> "$AWS_CALLS"
  printf '%s\\n' "$@" > "$AWS_ARGS"
  if [[ "$AWS_FAILURE" == "true" ]]; then
    echo 'AccessDeniedException: test denial' >&2
    return 42
  fi
  if [[ "$PENDING_FIRST" == "true" && $(wc -l < "$AWS_CALLS") -eq 1 ]]; then
    echo null
  else
    printf '%s\\n' "$SCAN_RESPONSE"
  fi
}
date() {
  if [[ -e "$CLOCK_STARTED" ]]; then
    printf '%s\\n' "$NEXT_TIME"
  else
    touch "$CLOCK_STARTED"
    echo 0
  fi
}
sleep() { :; }
`

let work: string

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), 'scan-workflow-test-'))
})

afterEach(() => {
  rmSync(work, { recursive: true, force: true })
})

function run(script: string, env: Record<string, string> = {}) {
  return spawnSync(
    'bash',
    ['--noprofile', '--norc', '-eo', 'pipefail', '-c', script],
    {
      cwd: work,
      encoding: 'utf8',
      timeout: 5000,
      env: {
        ...process.env,
        AWS_ROLE_ARN: 'arn:aws:iam::123456789012:role/test-scan',
        ECR_REPOSITORY: 'izg-configuration-console',
        GH_PKG_NAME: 'izgw-cc',
        IMAGE_TAG: '1.18.0-1190',
        RELEASE_DATE: '2026-09-10',
        GITHUB_OUTPUT: join(work, 'outputs'),
        AWS_CALLS: join(work, 'aws-calls'),
        AWS_ARGS: join(work, 'aws-args'),
        CLOCK_STARTED: join(work, 'clock-started'),
        AWS_FAILURE: 'false',
        PENDING_FIRST: 'false',
        SCAN_RESPONSE: '{"statusCode":"ACTIVE","reason":"SUCCESSFUL"}',
        NEXT_TIME: '1200',
        ...env,
      },
    }
  )
}

function expectFailure(result: ReturnType<typeof run>, message?: string) {
  expect(result.error).toBeUndefined()
  expect(result.status).not.toBeNull()
  expect(result.status).not.toBe(0)
  if (message) expect(result.stdout + result.stderr).toContain(message)
}

test('scan jobs and steps do not suppress execution failures', () => {
  for (const job of Object.values(workflow.jobs)) {
    expect(job['continue-on-error']).not.toBe(true)
    expect(job.uses).toBeUndefined()
    for (const step of job.steps) {
      expect(step['continue-on-error']).not.toBe(true)
      expect(step.if).toBeUndefined()
    }
  }
  expect(reportJob.needs).toBe('wait-for-inspector2-scan')
  expect(
    reportJob.steps.find(
      (step) => step.name === 'Checkout shared report scripts'
    )?.with
  ).toMatchObject({ repository: 'IZGateway/izg-dependency-scripts', ref: 'v1' })
  expect(reportJob.steps.at(-1)?.with).toMatchObject({
    'if-no-files-found': 'error',
    'retention-days': 90,
  })
})

test('release scan dispatch remains separate and non-blocking', () => {
  const release = load(
    readFileSync(resolve('.github/workflows/_release_common.yml'), 'utf8')
  ) as Workflow
  const dispatch = release.jobs.release.steps.find(
    (step) => step.id === 'dispatch-scan'
  )
  expect(dispatch?.['continue-on-error']).toBe(true)
  expect(dispatch?.if).toBe('inputs.dry-run == false')
  expect(dispatch?.run).toContain('gh workflow run scan-ecr-image.yml')
})

test.each(['1.18.0', '1.18.0-1190', '1.18.0-RELEASE-42'])(
  'metadata accepts image tag %s',
  (tag) => {
    const result = run(metadata, { IMAGE_TAG: tag })
    expect(result.status).toBe(0)
    expect(readFileSync(join(work, 'outputs'), 'utf8')).toContain(
      `image-version=${tag.split('-RELEASE-')[0]}`
    )
  }
)

test('missing AWS role fails with an actionable error', () => {
  expectFailure(run(metadata, { AWS_ROLE_ARN: '' }), 'Set the AWS_ROLE_ARN')
})

test.each(['', '../escape', 'bad tag', '$(touch marker)', 'a'.repeat(129)])(
  'invalid image tag %p fails before authentication',
  (tag) =>
    expectFailure(
      run(metadata, { IMAGE_TAG: tag }),
      'valid container image tag'
    )
)

test('completed Inspector2 scan succeeds', () => {
  expect(run(pollMocks + poll).status).toBe(0)
  expect(readFileSync(join(work, 'aws-args'), 'utf8')).toContain('1.18.0-1190')
})

test('scan can become ready after an initially empty response', () => {
  expect(
    run(pollMocks + poll, { PENDING_FIRST: 'true', NEXT_TIME: '1' }).status
  ).toBe(0)
  expect(
    readFileSync(join(work, 'aws-calls'), 'utf8').match(/list-coverage/g)
  ).toHaveLength(2)
})

test('AWS errors fail immediately and preserve diagnostics', () => {
  const result = run(pollMocks + poll, { AWS_FAILURE: 'true' })
  expectFailure(result, 'AccessDeniedException')
  expect(result.status).toBe(42)
})

test('invalid AWS JSON is not treated as a completed scan', () => {
  expectFailure(run(pollMocks + poll, { SCAN_RESPONSE: 'not-json' }))
})

test.each([
  'null',
  '{"statusCode":"PENDING","reason":"PENDING_INITIAL_SCAN"}',
  '{"statusCode":"INACTIVE","reason":"SUCCESSFUL"}',
])('uncompleted scan %s fails at the deadline', (response) => {
  expectFailure(
    run(pollMocks + poll, { SCAN_RESPONSE: response }),
    'did not complete within 20 minutes'
  )
})

test('a failure from the shared report script propagates', () => {
  const scripts = join(work, 'izg-dependency-scripts/.github/scripts')
  mkdirSync(scripts, { recursive: true })
  writeFileSync(
    join(scripts, 'ecr-scan-report.sh'),
    'echo "Report failed" >&2\nexit 23\n'
  )
  const result = run(generate)
  expectFailure(result, 'Report failed')
  expect(result.status).toBe(23)
})

test('the shared report script receives the same report inputs', () => {
  const scripts = join(work, 'izg-dependency-scripts/.github/scripts')
  mkdirSync(scripts, { recursive: true })
  writeFileSync(
    join(scripts, 'ecr-scan-report.sh'),
    'printf "%s\\n" "$@" > report-args\n'
  )
  expect(run(generate).status).toBe(0)
  expect(
    readFileSync(join(work, 'report-args'), 'utf8').trim().split('\n')
  ).toEqual([
    '--repo',
    'izg-configuration-console',
    '--tag',
    '1.18.0-1190',
    '--pkg',
    'izgw-cc',
    '--release-date',
    '2026-09-10',
    '--out-dir',
    'scan-reports',
  ])
})

const reportBase = '20260910_izgw-cc_v1.18.0-1190_InspectorScan'

function reports(json = '{"findings":[]}') {
  mkdirSync(join(work, 'scan-reports'))
  writeFileSync(join(work, 'scan-reports', `${reportBase}.json`), json)
  writeFileSync(
    join(work, 'scan-reports', `${reportBase}.csv`),
    '"CVE ID","Severity"\n'
  )
  writeFileSync(
    join(work, 'scan-reports', `${reportBase}.html`),
    '<html>Report</html>'
  )
}

test.each(['{"findings":[]}', '{"findings":[{"severity":"HIGH"}]}'])(
  'complete reports succeed regardless of findings: %s',
  (json) => {
    reports(json)
    expect(run(requireReports).status).toBe(0)
  }
)

test.each(['json', 'csv', 'html'])('a missing %s report fails', (extension) => {
  reports()
  rmSync(join(work, 'scan-reports', `${reportBase}.${extension}`))
  expectFailure(run(requireReports), 'Missing or empty scan report')
})

test('an empty report fails', () => {
  reports()
  writeFileSync(join(work, 'scan-reports', `${reportBase}.html`), '')
  expectFailure(run(requireReports), 'Missing or empty scan report')
})

test.each(['invalid-json', '{}', '{"findings":null}'])(
  'an invalid findings envelope fails: %s',
  (json) => {
    reports(json)
    expectFailure(run(requireReports))
  }
)
