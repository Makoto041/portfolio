import { ValidationError } from 'payload'
import { describe, expect, it } from 'vitest'
import { isUniqueViolation } from '../quickpost/dbErrors'

describe('isUniqueViolation（一意制約で断られた書き込みか）', () => {
  it('Payload の ValidationError で、その項目の違反なら true', () => {
    const e = new ValidationError({
      collection: 'quickpost-nonces',
      errors: [{ message: 'Value must be unique', path: 'key' }],
    })
    expect(isUniqueViolation(e, 'key')).toBe(true)
    expect(isUniqueViolation(e, 'credentialId')).toBe(false)
  })

  it('クラスが別物でも、形（status 400 と errors[].path）が同じなら true', () => {
    const e = Object.assign(new Error('dup'), {
      status: 400,
      data: { errors: [{ message: 'Value must be unique', path: 'credentialId' }] },
    })
    expect(isUniqueViolation(e, 'credentialId')).toBe(true)
  })

  it('DB の障害など（400 でない・errors が無い）は false', () => {
    expect(isUniqueViolation(new Error('connection terminated'), 'key')).toBe(false)
    expect(isUniqueViolation({ status: 500, data: { errors: [{ path: 'key' }] } }, 'key')).toBe(
      false,
    )
    expect(isUniqueViolation({ status: 400, data: null }, 'key')).toBe(false)
    expect(isUniqueViolation(null, 'key')).toBe(false)
    expect(isUniqueViolation('key', 'key')).toBe(false)
  })
})
