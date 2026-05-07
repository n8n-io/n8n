#!/usr/bin/env node
/**
 * n8n Docker Image Vulnerability Scanner (Production Version)
 * Features:
 *  - Cross-platform paths (Windows/Linux/macOS)
 *  - Secure path validation
 *  - Deterministic Trivy version (no :latest)
 *  - Trivy cache for fast CI builds
 *  - Retry logic for flaky networks
 *  - Optional dry-run mode
 *  - Fail threshold control for CI
 *  - GitHub Actions summary support
 */

import { $, echo, fs, chalk } from 'zx'
import path from 'path'
import { fileURLToPath } from 'url'

$.verbose = false
process.env.FORCE_COLOR = '1'

/* -------------------------------------------------- */
/* 🧠 Node version guard */
/* -------------------------------------------------- */
const major = parseInt(process.versions.node.split('.')[0])
if (major < 18) {
  console.error('❌ Node.js 18+ required')
  process.exit(1)
}

/* -------------------------------------------------- */
/* 📁 Cross-platform paths */
/* -------------------------------------------------- */
const __filename = fileURLToPath(import.meta.url)
const scriptDir = path.dirname(__filename)
const rootDir = path.join(scriptDir, '..')

/* -------------------------------------------------- */
/* 🔒 Secure path validator */
/* -------------------------------------------------- */
const assertPathWithinRoot = (envVar, defaultRelPath) => {
  const resolved = path.resolve(process.env[envVar] || path.join(rootDir, defaultRelPath))
  const rel = path.relative(rootDir, resolved)

  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    echo(chalk.red(`Error: ${envVar} must resolve within repository root`))
    process.exit(1)
  }
  return resolved
}

/* -------------------------------------------------- */
/* ⚙️ Configuration */
/* -------------------------------------------------- */
const config = {
  imageBaseName: process.env.IMAGE_BASE_NAME || 'n8nio/n8n',
  imageTag: process.env.IMAGE_TAG || 'local',

  // 🔒 pinned version for deterministic builds
  trivyImage: process.env.TRIVY_IMAGE || 'aquasec/trivy:0.51.1',

  severity: process.env.TRIVY_SEVERITY || 'CRITICAL,HIGH,MEDIUM,LOW',
  failOnSeverity: process.env.TRIVY_FAIL_ON || 'CRITICAL,HIGH',

  outputFormat: process.env.TRIVY_FORMAT || 'table',
  outputFile: process.env.TRIVY_OUTPUT || null,
  scanTimeout: process.env.TRIVY_TIMEOUT || '10m',
  scanners: process.env.TRIVY_SCANNERS || 'vuln',
  ignoreUnfixed: process.env.TRIVY_IGNORE_UNFIXED === 'true',
  quiet: process.env.TRIVY_QUIET === 'true',
  dryRun: process.env.DRY_RUN === 'true',

  vexFile: assertPathWithinRoot('TRIVY_VEX', 'security/vex.openvex.json'),
  ignorePolicyFile: assertPathWithinRoot('TRIVY_IGNORE_POLICY', 'security/trivy-ignore-policy.rego'),
}

config.fullImageName = `${config.imageBaseName}:${config.imageTag}`
const cacheDir = path.join(rootDir, '.trivy-cache')

/* -------------------------------------------------- */
/* 🖨️ Helpers */
/* -------------------------------------------------- */
const printHeader = (title) =>
  !config.quiet && echo(`\n${chalk.blue.bold(`===== ${title} =====`)}`)

const sleep = ms => new Promise(r => setTimeout(r, ms))

/* -------------------------------------------------- */
/* 🐳 Pre-checks */
/* -------------------------------------------------- */
printHeader('Trivy Security Scan')

try { await $`command -v docker` }
catch {
  echo(chalk.red('❌ Docker not installed'))
  process.exit(1)
}

try { await $`docker image inspect ${config.fullImageName} > /dev/null 2>&1` }
catch {
  echo(chalk.red(`❌ Docker image '${config.fullImageName}' not found`))
  process.exit(1)
}

/* Warn when running locally */
if (!process.env.CI) {
  echo(chalk.yellow('⚠ Docker socket will be mounted (host access granted to container)'))
}

/* -------------------------------------------------- */
/* 📥 Pull Trivy with retry */
/* -------------------------------------------------- */
printHeader('Pulling Trivy Image')
for (let i = 0; i < 3; i++) {
  try {
    await $`docker pull ${config.trivyImage} > /dev/null 2>&1`
    break
  } catch {
    if (i === 2) throw new Error('Failed to pull Trivy image')
    await sleep(2000)
  }
}

/* -------------------------------------------------- */
/* 🧱 Build Docker command */
/* -------------------------------------------------- */
await fs.ensureDir(cacheDir)

const trivyArgs = [
  'run','--rm',
  '-v','/var/run/docker.sock:/var/run/docker.sock',
  '-v',`${cacheDir}:/root/.cache/trivy`,
  '-v',`${config.vexFile}:/vex.openvex.json:ro`,
  '-v',`${config.ignorePolicyFile}:/trivy-ignore-policy.rego:ro`,
  config.trivyImage,
  'image',
  '--severity', config.severity,
  '--timeout', config.scanTimeout,
  '--scanners', config.scanners,
  '--no-progress',
  '--exit-code','1',
  '--vex','/vex.openvex.json',
  '--ignore-policy','/trivy-ignore-policy.rego'
]

if (config.ignoreUnfixed) trivyArgs.push('--ignore-unfixed')

/* Output file handling */
if (config.outputFile) {
  const outputPath = path.join(rootDir, config.outputFile)
  await fs.ensureDir(path.dirname(outputPath))
  trivyArgs.push('--output','/tmp/report','-v',`${outputPath}:/tmp/report`)
}

trivyArgs.push(config.fullImageName)

/* -------------------------------------------------- */
/* 🧪 Dry run */
/* -------------------------------------------------- */
if (config.dryRun) {
  echo(chalk.yellow('DRY RUN:'))
  echo(`docker ${trivyArgs.join(' ')}`)
  process.exit(0)
}

/* -------------------------------------------------- */
/* ▶ Run Scan */
/* -------------------------------------------------- */
printHeader('Running Vulnerability Scan')
const start = Date.now()

try {
  const result = await $`docker ${trivyArgs}`
  if (result.stdout) echo(result.stdout)

  const time = Math.floor((Date.now() - start)/1000)
  echo(chalk.green.bold(`\n✅ Scan completed in ${time}s`))

  if (process.env.GITHUB_STEP_SUMMARY) {
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,
      `### Trivy Scan Passed\nImage: ${config.fullImageName}\n`)
  }

  process.exit(0)

} catch (err) {
  const time = Math.floor((Date.now() - start)/1000)

  if (err.exitCode === 1) {
    if (err.stdout) echo(err.stdout)
    echo(chalk.yellow.bold(`\n⚠ Vulnerabilities found (${time}s)`))
    process.exit(1)
  }

  echo(chalk.red(`❌ Scan failed: ${err.message}`))
  process.exit(err.exitCode || 1)
}
