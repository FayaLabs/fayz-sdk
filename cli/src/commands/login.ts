import { createInterface } from 'node:readline'
import {
  BASE_URL_ENV_VAR,
  CREDENTIALS_ENV_VAR,
  credentialsPath,
  isValidTokenFormat,
  maskToken,
  readCredentials,
  removeCredentials,
  TOKEN_PREFIX,
  writeCredentials,
  type StoredCredentials,
} from '../lib/fayz-platform.js'

// `fayz login` / `fayz logout` (milestone P5.1). Stores a Fayz platform PAT at
// ~/.fayz/credentials.json (mode 0600) for `fayz deploy` to consume. NO network
// validation in v1 — the token is validated on the first deploy. The only inputs
// are the --token flag, env FAYZ_TOKEN, or an interactive prompt (non-TTY without
// a token fails fast with instructions rather than hanging on stdin).

interface LoginFlags {
  token?: string
  status: boolean
}

function parseLoginFlags(args: string[]): LoginFlags {
  const flags: LoginFlags = { status: false }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--status') flags.status = true
    else if (a === '--token') flags.token = args[++i]
    else if (a.startsWith('--token=')) flags.token = a.slice('--token='.length)
  }
  return flags
}

/** Read a single line from stdin (only reached on a TTY). */
async function promptLine(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return await new Promise<string>((res) => rl.question(question, res))
  } finally {
    rl.close()
  }
}

export async function login(args: string[]): Promise<number> {
  const flags = parseLoginFlags(args)
  const path = credentialsPath()

  // --status: report whether a credential exists (masked), zero network.
  if (flags.status) {
    const stored = readCredentials(path)
    if (!stored) {
      console.log('▸ Nenhuma credencial encontrada.')
      console.log(`  Rode 'fayz login' para salvar seu token (${path}).`)
      return 0
    }
    console.log(`▸ Credencial encontrada em ${path}`)
    console.log(`  token: ${maskToken(stored.token)}`)
    if (stored.baseUrl) console.log(`  baseUrl: ${stored.baseUrl}`)
    return 0
  }

  // Resolve the token: --token flag → env FAYZ_TOKEN → interactive prompt.
  let token = flags.token ?? process.env[CREDENTIALS_ENV_VAR]
  if (!token) {
    if (!process.stdin.isTTY) {
      console.error(
        '✗ Nenhum token fornecido e o terminal não é interativo.\n' +
          `  Passe --token <${TOKEN_PREFIX}...>, ou defina ${CREDENTIALS_ENV_VAR} no ambiente.\n` +
          `  Ex.: fayz login --token ${TOKEN_PREFIX}xxxxxxxx`,
      )
      return 1
    }
    token = (await promptLine(`Cole seu token Fayz (${TOKEN_PREFIX}...): `)).trim()
  }
  token = token.trim()

  if (!isValidTokenFormat(token)) {
    console.error(
      `✗ Token inválido. Um token Fayz começa com '${TOKEN_PREFIX}' (ex.: ${TOKEN_PREFIX}xxxxxxxx).\n` +
        '  Gere um em Fayz → Configurações → Tokens de acesso (rollout).',
    )
    return 1
  }

  const cred: StoredCredentials = { token }
  const baseUrl = process.env[BASE_URL_ENV_VAR]
  if (baseUrl) cred.baseUrl = baseUrl

  try {
    writeCredentials(path, cred)
  } catch (err) {
    console.error(`✗ Não foi possível gravar ${path}: ${(err as Error).message}`)
    return 1
  }

  console.log(`✓ Token salvo em ${path} (permissão 0600).`)
  console.log(`  ${maskToken(token)}`)
  console.log('  O token será validado no primeiro deploy (nenhuma chamada de rede foi feita agora).')
  return 0
}

export async function logout(): Promise<number> {
  const path = credentialsPath()
  const existed = removeCredentials(path)
  if (existed) {
    console.log(`✓ Credencial removida (${path}).`)
  } else {
    console.log('▸ Nenhuma credencial para remover.')
  }
  return 0
}
