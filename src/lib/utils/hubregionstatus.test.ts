/**
 * @jest-environment node
 */
import {
  hubOperationLevel,
  regionsNotComplete,
} from './hubregionstatus'

describe('hubOperationLevel', () => {
  it('reports success when every region completed', () => {
    expect(
      hubOperationLevel({ 'us-east-1': 'complete', 'us-west-1': 'complete' })
    ).toBe('success')
  })

  it('reports a warning when one region is partial', () => {
    expect(
      hubOperationLevel({ 'us-east-1': 'complete', 'us-west-1': 'partial' })
    ).toBe('warning')
  })

  it('reports an error when every region failed', () => {
    expect(
      hubOperationLevel({ 'us-east-1': 'failed', 'us-west-1': 'failed' })
    ).toBe('error')
  })

  it('reports a warning when one region failed and another completed', () => {
    expect(
      hubOperationLevel({ 'us-east-1': 'complete', 'us-west-1': 'failed' })
    ).toBe('warning')
  })

  // Fail closed. A later hub release that adds a status word must not be able
  // to make this console report a failure as a completed reset.
  it('reports a warning for a status word it does not recognise', () => {
    expect(
      hubOperationLevel({ 'us-east-1': 'complete', 'us-west-1': 'draining' })
    ).toBe('warning')
  })

  it('does not report success when every region carries an unknown word', () => {
    expect(hubOperationLevel({ 'us-east-1': 'ok', 'us-west-1': 'ok' })).toBe(
      'warning'
    )
  })

  it('is case sensitive, so a differently cased word is not success', () => {
    expect(hubOperationLevel({ 'us-east-1': 'Complete' })).toBe('warning')
  })

  describe('when the hub sent no usable block', () => {
    it.each([
      ['undefined', undefined],
      ['an empty object', {}],
      ['null', null],
      ['a string', 'complete'],
      ['an array', ['complete']],
    ])('returns undefined for %s', (_label, input) => {
      expect(
        hubOperationLevel(input as Parameters<typeof hubOperationLevel>[0])
      ).toBeUndefined()
    })
  })
})

describe('regionsNotComplete', () => {
  it('names only the regions that did not complete', () => {
    expect(
      regionsNotComplete({
        'us-east-1': 'complete',
        'us-west-1': 'partial',
        'us-west-2': 'failed',
      })
    ).toEqual(['us-west-1', 'us-west-2'])
  })

  it('returns an empty array when every region completed', () => {
    expect(regionsNotComplete({ 'us-east-1': 'complete' })).toEqual([])
  })

  it('returns an empty array when the hub sent no block', () => {
    expect(regionsNotComplete(undefined)).toEqual([])
    expect(regionsNotComplete({})).toEqual([])
  })
})
