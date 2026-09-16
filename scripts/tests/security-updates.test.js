/** @jest-environment node */

const { readFileSync, mkdtempSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { resolve, join } = require('node:path')
const { spawnSync } = require('node:child_process')
const { load } = require('js-yaml')

const workflow = load(
  readFileSync(
    resolve(__dirname, '../../.github/workflows/security-updates.yml'),
    'utf8'
  )
)
const steps = workflow.jobs['update-dependencies'].steps
const commitStep = steps.find((step) => step.id === 'commit_changes')
const mergeStep = steps.find(
  (step) => step.name === 'Wait for PR checks, then merge if green'
)
const repository = 'IZGateway/izg-configuration-console'
const branch = 'automated-security-updates-20260914-090000'
const headSha = 'a'.repeat(40)
const validPr = {
  number: 123,
  url: `https://github.com/${repository}/pull/123`,
  state: 'OPEN',
  baseRefName: 'develop',
  headRefName: branch,
  headRefOid: headSha,
  isCrossRepository: false,
  isDraft: false,
  changedFiles: 2,
  files: [{ path: 'package.json' }, { path: 'package-lock.json' }],
}
const branchRefs = [{ ref: `refs/heads/${branch}`, object: { sha: headSha } }]

const mocks = String.raw`
checks_finished=false
checks_registered=false
gh() {
  printf 'MOCK_GH %s\n' "$*" >&2
  case "$1 $2" in
    "pr view")
      if [ "$SCENARIO" = metadata_error ] || { [ "$SCENARIO" = metadata_error_after_checks ] && [ "$checks_finished" = true ]; }; then
        echo 'Cannot read PR metadata' >&2
        return 1
      fi
      if [ "$checks_finished" = true ]; then
        printf '%s\n' "$AFTER_PR_METADATA"
      else
        printf '%s\n' "$PR_METADATA"
      fi
      ;;
    "pr checks")
      case " $* " in
        *" --watch "*)
          echo MOCK_WATCH >&2
          checks_finished=true
          case "$SCENARIO" in
            watch_failed) echo 'CI failed' >&2; return 1 ;;
            *) return 0 ;;
          esac
          ;;
      esac
      case "$SCENARIO" in
        no_checks) echo 'no checks reported on this branch'; return 1 ;;
        delayed)
          if [ "$checks_registered" = false ]; then
            echo 'no checks reported on this branch'
            return 1
          fi
          return 8
          ;;
        checks_error) echo 'Resource not accessible by integration'; return 1 ;;
        checks_failed) echo 'CI failed'; return 1 ;;
        pending) return 8 ;;
        *) return 0 ;;
      esac
      ;;
    "api --method")
      case "$3" in
        PUT)
          echo MOCK_MERGE >&2
          if [ "$SCENARIO" = merge_error ]; then
            echo 'Merge rejected by GitHub' >&2
            return 1
          fi
          printf '%s\n' "$MERGE_RESPONSE_FIXTURE"
          ;;
        DELETE)
          echo MOCK_DELETE >&2
          if [ "$SCENARIO" = cleanup_error ]; then
            echo 'Branch deletion denied' >&2
            return 1
          fi
          ;;
        *) echo 'Unexpected API method' >&2; return 99 ;;
      esac
      ;;
    "api repos/"*"/git/matching-refs/heads/"*)
      if [ "$SCENARIO" = refs_error ]; then
        echo 'Cannot read branch references' >&2
        return 1
      fi
      printf '%s\n' "$BRANCH_REFS_FIXTURE"
      ;;
    *) echo 'Unexpected gh command' >&2; return 99 ;;
  esac
}
sleep() {
  echo MOCK_SLEEP
  checks_registered=true
}
`

function runMerge({
  scenario = 'green',
  pr = {},
  afterPr = {},
  mergeResponse = '{"merged":true}',
  refs = branchRefs,
  env = {},
} = {}) {
  const metadata = { ...validPr, ...pr }
  const result = spawnSync('bash', ['-e', '-o', 'pipefail'], {
    input: `${mocks}\n${mergeStep.run}`,
    encoding: 'utf8',
    timeout: 5000,
    env: {
      PATH: process.env.PATH,
      GITHUB_REPOSITORY: repository,
      GITHUB_SERVER_URL: 'https://github.com',
      PR_URL: validPr.url,
      EXPECTED_BRANCH: branch,
      EXPECTED_HEAD_SHA: headSha,
      SCENARIO: scenario,
      PR_METADATA: JSON.stringify(metadata),
      AFTER_PR_METADATA: JSON.stringify({ ...metadata, ...afterPr }),
      MERGE_RESPONSE_FIXTURE: mergeResponse,
      BRANCH_REFS_FIXTURE: JSON.stringify(refs),
      ...env,
    },
  })
  expect(result.error).toBeUndefined()
  return { status: result.status, output: result.stdout + result.stderr }
}

describe('security-update workflow', () => {
  it('uses scoped App credentials for Git and PR operations', () => {
    expect(workflow.permissions).toEqual({ contents: 'read', packages: 'read' })
    const appToken = steps.find((step) => step.id === 'app-token')
    expect(appToken.uses).toBe('actions/create-github-app-token@v3')
    expect(appToken.with).toEqual({
      'app-id': '${{ secrets.DEPENDENCY_BOT_APP_ID }}',
      'private-key': '${{ secrets.DEPENDENCY_BOT_APP_KEY }}',
      'permission-contents': 'write',
      'permission-pull-requests': 'write',
      'permission-checks': 'read',
      'permission-statuses': 'read',
    })
    expect(
      steps.find((step) => step.name === 'Checkout repository').with
    ).toEqual({
      token: '${{ steps.app-token.outputs.token }}',
      ref: 'develop',
    })
    expect(
      steps.find((step) => step.name === 'Create Pull Request').env
    ).toEqual({
      GH_TOKEN: '${{ steps.app-token.outputs.token }}',
    })
    expect(mergeStep.env).toEqual({
      GH_TOKEN: '${{ steps.app-token.outputs.token }}',
      EXPECTED_HEAD_SHA: '${{ steps.commit_changes.outputs.head_sha }}',
      EXPECTED_BRANCH: '${{ env.branch_name }}',
    })
    expect(mergeStep['timeout-minutes']).toBe(20)
    expect(mergeStep.run).toContain('--watch --fail-fast --interval 30')
  })

  it('only validates, publishes, and merges when a commit was created', () => {
    for (const name of [
      'Run code quality checks',
      'Run tests',
      'Build application',
      'Run security audit',
      'Generate change summary',
      'Push branch',
      'Create Pull Request',
      'Wait for PR checks, then merge if green',
    ]) {
      expect(steps.find((step) => step.name === name).if).toBe(
        "steps.final_check.outputs.has_changes == 'true' && steps.commit_changes.outputs.has_committed_changes == 'true'"
      )
    }
    for (const name of ['Run code quality checks', 'Build application']) {
      expect(
        steps.find((step) => step.name === name)['continue-on-error']
      ).toBeUndefined()
    }
    for (const name of ['Run tests', 'Run security audit']) {
      expect(
        steps.find((step) => step.name === name)['continue-on-error']
      ).toBe(true)
    }
  })

  it.each(['changed', 'unchanged', 'commit_error'])(
    'handles dependency commit creation: %s',
    (scenario) => {
      const directory = mkdtempSync(join(tmpdir(), 'security-updates-test-'))
      const outputFile = join(directory, 'output')
      try {
        const result = spawnSync('bash', ['-e', '-o', 'pipefail'], {
          input:
            String.raw`
npm() { return 0; }
git() {
  case "$1" in
    add) return 0 ;;
    diff) [ "$SCENARIO" = unchanged ] ;;
    commit)
      echo MOCK_COMMIT
      [ "$SCENARIO" != commit_error ]
      ;;
    rev-parse) printf '%s\n' "$HEAD_SHA" ;;
    *) echo 'Unexpected git command' >&2; return 99 ;;
  esac
}
` + commitStep.run,
          cwd: directory,
          encoding: 'utf8',
          timeout: 5000,
          env: {
            PATH: process.env.PATH,
            GITHUB_OUTPUT: outputFile,
            HEAD_SHA: headSha,
            SCENARIO: scenario,
          },
        })
        expect(result.error).toBeUndefined()
        if (scenario === 'commit_error') {
          expect(result.status).not.toBe(0)
          expect(result.stdout).toContain('MOCK_COMMIT')
        } else {
          expect(result.status).toBe(0)
          expect(readFileSync(outputFile, 'utf8')).toBe(
            scenario === 'changed'
              ? `head_sha=${headSha}\nhas_committed_changes=true\n`
              : 'has_committed_changes=false\n'
          )
          if (scenario === 'unchanged') {
            expect(result.stdout).not.toContain('MOCK_COMMIT')
          }
        }
      } finally {
        rmSync(directory, { recursive: true, force: true })
      }
    }
  )

  it.each(['green', 'pending', 'delayed'])(
    'merges the exact checked SHA and then deletes the branch: %s',
    (scenario) => {
      const { status, output } = runMerge({ scenario })
      expect(status).toBe(0)
      expect(output).toContain(
        `api --method PUT repos/${repository}/pulls/123/merge -f merge_method=squash -f sha=${headSha}`
      )
      expect(output).not.toContain('MOCK_GH pr merge')
      expect(output.indexOf('MOCK_MERGE')).toBeGreaterThan(
        output.indexOf('MOCK_WATCH')
      )
      expect(output.indexOf('MOCK_DELETE')).toBeGreaterThan(
        output.indexOf('MOCK_MERGE')
      )
      expect(output).toContain(
        `api --method DELETE repos/${repository}/git/refs/heads/${branch}`
      )
      expect((output.match(/MOCK_SLEEP/g) || []).length).toBe(
        scenario === 'delayed' ? 1 : 0
      )
    }
  )

  it.each(['package.json', 'package-lock.json'])(
    'allows a PR changing only %s',
    (path) => {
      expect(
        runMerge({ pr: { changedFiles: 1, files: [{ path }] } }).status
      ).toBe(0)
    }
  )

  it.each([
    ['wrong base', { baseRefName: 'main' }],
    ['wrong branch', { headRefName: 'another-branch' }],
    ['wrong commit', { headRefOid: 'b'.repeat(40) }],
    ['another repository', { url: 'https://github.com/other/repo/pull/123' }],
    ['fork', { isCrossRepository: true }],
    ['draft', { isDraft: true }],
    ['closed', { state: 'CLOSED' }],
    ['no changes', { changedFiles: 0, files: [] }],
    ['incomplete file list', { changedFiles: 3 }],
    [
      'workflow edit',
      {
        files: [
          { path: 'package.json' },
          { path: '.github/workflows/security-updates.yml' },
        ],
      },
    ],
  ])('rejects a PR with %s', (_name, pr) => {
    const { status, output } = runMerge({ pr })
    expect(status).not.toBe(0)
    expect(output).not.toContain('MOCK_WATCH')
    expect(output).not.toContain('MOCK_MERGE')
    expect(output).not.toContain('MOCK_DELETE')
  })

  it.each([
    ['base', { baseRefName: 'main' }],
    ['head', { headRefOid: 'b'.repeat(40) }],
    ['files', { files: [{ path: 'src/pages/index.tsx' }] }],
  ])('rejects a changed PR %s after waiting for checks', (_name, afterPr) => {
    const { status, output } = runMerge({ afterPr })
    expect(status).not.toBe(0)
    expect(output).toContain('MOCK_WATCH')
    expect(output).not.toContain('MOCK_MERGE')
    expect(output).not.toContain('MOCK_DELETE')
  })

  it.each([
    'metadata_error',
    'metadata_error_after_checks',
    'checks_error',
    'checks_failed',
    'watch_failed',
    'no_checks',
  ])('does not merge or delete after %s', (scenario) => {
    const { status, output } = runMerge({ scenario })
    expect(status).not.toBe(0)
    expect(output).not.toContain('MOCK_MERGE')
    expect(output).not.toContain('MOCK_DELETE')
    expect((output.match(/MOCK_SLEEP/g) || []).length).toBe(
      scenario === 'no_checks' ? 19 : 0
    )
  })

  it.each(['PR_URL', 'EXPECTED_BRANCH', 'EXPECTED_HEAD_SHA'])(
    'rejects a missing %s',
    (name) => {
      const { status, output } = runMerge({ env: { [name]: '' } })
      expect(status).not.toBe(0)
      expect(output).not.toContain('MOCK_GH')
    }
  )

  it('rejects a non-automation branch before any GitHub calls', () => {
    const { status, output } = runMerge({
      env: { EXPECTED_BRANCH: 'develop' },
    })
    expect(status).not.toBe(0)
    expect(output).not.toContain('MOCK_GH')
  })

  it('rejects malformed PR metadata', () => {
    const { status, output } = runMerge({
      env: { PR_METADATA: 'invalid JSON' },
    })
    expect(status).not.toBe(0)
    expect(output).not.toContain('MOCK_MERGE')
    expect(output).not.toContain('MOCK_DELETE')
  })

  it.each([
    ['API failure', { scenario: 'merge_error' }],
    [
      'merge refused',
      { mergeResponse: '{"merged":false,"message":"Blocked"}' },
    ],
    ['missing confirmation', { mergeResponse: '{}' }],
    ['malformed response', { mergeResponse: 'invalid JSON' }],
  ])('keeps the branch when the merge returns %s', (_name, options) => {
    const { status, output } = runMerge(options)
    expect(status).not.toBe(0)
    expect(output).toContain('MOCK_MERGE')
    expect(output).not.toContain('MOCK_DELETE')
  })

  it('accepts a branch already deleted by GitHub', () => {
    const { status, output } = runMerge({ refs: [] })
    expect(status).toBe(0)
    expect(output).toContain('Merged branch is already deleted.')
    expect(output).not.toContain('MOCK_DELETE')
  })

  it('does not delete a different branch with the same prefix', () => {
    const { status, output } = runMerge({
      refs: [{ ref: `refs/heads/${branch}-other`, object: { sha: headSha } }],
    })
    expect(status).toBe(0)
    expect(output).not.toContain('MOCK_DELETE')
  })

  it('preserves a branch that changed after merging', () => {
    const { status, output } = runMerge({
      refs: [{ ref: `refs/heads/${branch}`, object: { sha: 'b'.repeat(40) } }],
    })
    expect(status).toBe(0)
    expect(output).toContain('::warning::The branch changed after merging')
    expect(output).not.toContain('MOCK_DELETE')
  })

  it.each(['refs_error', 'cleanup_error'])(
    'surfaces cleanup errors after merging: %s',
    (scenario) => {
      const { status, output } = runMerge({ scenario })
      expect(status).not.toBe(0)
      expect(output).toContain('Merged:')
    }
  )
})
