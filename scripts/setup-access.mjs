import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline/promises'
import { hashPassword } from '../lib/password.mjs'

const rl = createInterface({ input: process.stdin, output: process.stdout })
const username = (await rl.question('Usuário [angelo.melim]: ')).trim() || 'angelo.melim'
rl.close()
if (!/^[a-zA-Z0-9._-]{3,80}$/.test(username)) throw new Error('Use letras, números, ponto, hífen ou sublinhado no usuário.')
function readPassword() {
  if (!process.stdin.isTTY) throw new Error('Execute em um terminal para informar a senha de forma privada.')
  process.stdout.write('Nova senha (mínimo 12 caracteres; digitação oculta): ')
  return new Promise((resolve, reject) => {
    let value = ''
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8')
    function cleanup() { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data', receive); process.stdout.write('\n') }
    function receive(chunk) {
      for (const c of chunk) {
        if (c === '\u0003') { cleanup(); reject(new Error('Cancelado')); return }
        if (c === '\r' || c === '\n') { cleanup(); resolve(value); return }
        if (c === '\u007f' || c === '\b') value = value.slice(0,-1)
        else if (c >= ' ') value += c
      }
    }
    process.stdin.on('data', receive)
  })
}
const password = await readPassword()
if (password.length < 12) throw new Error('A senha deve ter pelo menos 12 caracteres.')
const path = '.env.local'
let content = existsSync(path) ? readFileSync(path,'utf8') : ''
const values = { DASHBOARD_USERNAME: username, DASHBOARD_PASSWORD_HASH: hashPassword(password), NEXTAUTH_SECRET: randomBytes(48).toString('hex') }
if (!/^NEXTAUTH_URL=/m.test(content)) values.NEXTAUTH_URL = 'http://localhost:3000'
for (const [key,value] of Object.entries(values)) {
  const line = `${key}=${value}`
  const regex = new RegExp(`^${key}=.*$`, 'm')
  content = regex.test(content) ? content.replace(regex, line) : content.trimEnd() + '\n' + line + '\n'
}
writeFileSync(path, content.trimStart(), { mode: 0o600 })
console.log('Acesso configurado em .env.local. Sua senha não foi gravada em texto aberto.')
console.log('Na hospedagem, cadastre as três variáveis geradas e ajuste NEXTAUTH_URL para o endereço do sistema.')
