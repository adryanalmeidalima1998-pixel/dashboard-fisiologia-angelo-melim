import test from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyConfiguredPassword, credentialVersion } from '../lib/password.mjs'

test('login accepts the server-only password configured directly in the hosting dashboard', () => {
  const env = { DASHBOARD_PASSWORD: 'SenhaFicticia-Teste2027!' }
  assert.equal(verifyConfiguredPassword('SenhaFicticia-Teste2027!', env), true)
  assert.equal(verifyConfiguredPassword('senha errada', env), false)
  assert.equal(verifyConfiguredPassword(undefined, env), false)
})
test('missing or short password configuration never enables a default login', () => {
  assert.equal(verifyConfiguredPassword('', {}), false)
  assert.equal(verifyConfiguredPassword('curta', { DASHBOARD_PASSWORD: 'curta' }), false)
})
test('existing scrypt configuration still works and an explicit new password supersedes it', () => {
  const env = { DASHBOARD_PASSWORD_HASH: hashPassword('SenhaAntiga-Teste2026!') }
  assert.equal(verifyConfiguredPassword('SenhaAntiga-Teste2026!', env), true)
  env.DASHBOARD_PASSWORD = 'SenhaNova-Teste2027!'
  assert.equal(verifyConfiguredPassword('SenhaNova-Teste2027!', env), true)
  assert.equal(verifyConfiguredPassword('SenhaAntiga-Teste2026!', env), false)
})
test('changing the configured password invalidates the session credential version', () => {
  const first = { DASHBOARD_USERNAME: 'angelo.melim', DASHBOARD_PASSWORD: 'SenhaFicticia-Teste2027!' }
  assert.notEqual(credentialVersion(first), credentialVersion({ ...first, DASHBOARD_PASSWORD: 'OutraSenhaFicticia2027!' }))
  assert.match(credentialVersion(first), /^[0-9a-f]{24}$/)
  assert.equal(credentialVersion(first).includes(first.DASHBOARD_PASSWORD), false)
})
