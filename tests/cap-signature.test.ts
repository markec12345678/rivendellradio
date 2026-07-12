import { describe, expect, test } from 'bun:test'
import { verifyCapSignature, checkReplay, generateInternalDigest } from '../src/lib/cap-signature'

describe('CAP Signature', () => {
  test('verifyCapSignature trusts known IPAWS senders', () => {
    const result = verifyCapSignature('<alert>...</alert>', 'noaa@weather.gov')
    expect(result.valid).toBe(true)
    expect(result.method).toBe('sandbox')
  })

  test('verifyCapSignature trusts FEMA sender', () => {
    const result = verifyCapSignature('<alert>...</alert>', 'ipaws@fema.gov')
    expect(result.valid).toBe(true)
  })

  test('verifyCapSignature rejects unknown sender without signature', () => {
    const result = verifyCapSignature('<alert>...</alert>', 'evil@hacker.com')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Missing XML Digital Signature')
  })

  test('verifyCapSignature accepts XML with Signature element', () => {
    const xml = '<alert><ds:Signature>...</ds:Signature></alert>'
    const result = verifyCapSignature(xml, 'unknown@sender.com')
    expect(result.valid).toBe(true)
    expect(result.method).toBe('sandbox')
  })

  test('checkReplay allows first occurrence', () => {
    const result = checkReplay('sender-1', 'id-1', '2026-01-01T00:00:00Z')
    expect(result.isReplay).toBe(false)
  })

  test('checkReplay blocks duplicate within 24h', () => {
    checkReplay('sender-2', 'id-2', '2026-01-01T00:00:00Z')
    const result = checkReplay('sender-2', 'id-2', '2026-01-01T00:00:00Z')
    expect(result.isReplay).toBe(true)
    expect(result.firstReceivedAt).toBeDefined()
  })

  test('checkReplay allows different sender+id combination', () => {
    checkReplay('sender-3', 'id-3', '2026-01-01T00:00:00Z')
    const result = checkReplay('sender-4', 'id-4', '2026-01-01T00:00:00Z')
    expect(result.isReplay).toBe(false)
  })

  test('generateInternalDigest returns 64-char hex', () => {
    const digest = generateInternalDigest('<alert>test</alert>')
    expect(digest).toMatch(/^[a-f0-9]{64}$/)
  })

  test('generateInternalDigest is deterministic', () => {
    const d1 = generateInternalDigest('<alert>test</alert>')
    const d2 = generateInternalDigest('<alert>test</alert>')
    expect(d1).toBe(d2)
  })

  test('generateInternalDigest differs for different input', () => {
    const d1 = generateInternalDigest('<alert>test1</alert>')
    const d2 = generateInternalDigest('<alert>test2</alert>')
    expect(d1).not.toBe(d2)
  })
})
