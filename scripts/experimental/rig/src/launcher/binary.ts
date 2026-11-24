import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	renameSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { type GlobalConfig, launcherCheckout } from '../config/global-config';
import { cacheDir } from '../config/paths';
import { RigError } from '../errors';
import { RIG } from '../meta';

const CHECKOUT_BINARY = 'bin/main';
const BINARY_NAME = 'task-runner-launcher';
const REPOSITORY = 'https://github.com/n8n-io/task-runner-launcher';
/** The runners image pins the launcher release that n8n ships with. */
const RUNNERS_DOCKERFILE = 'docker/images/runners/Dockerfile.debian';
/** Used when neither the global config nor the checkout names a version. */
export const DEFAULT_LAUNCHER_VERSION = '1.6.0';
/** Release builds exist only for Linux. */
const RELEASE_ARCHES: Partial<Record<NodeJS.Architecture, string>> = {
	x64: 'amd64',
	arm64: 'arm64',
};

export type LauncherSource =
	| { kind: 'checkout'; path: string }
	| {
			kind: 'release';
			version: string;
			versionFrom: 'global config' | 'runners image' | 'default';
	  };

/** The launcher version that the runners image of the checkout installs. */
export function versionFromCheckout(repoRoot: string | undefined): string | undefined {
	if (!repoRoot) return undefined;
	const file = join(repoRoot, RUNNERS_DOCKERFILE);
	if (!existsSync(file)) return undefined;
	return /^ARG LAUNCHER_VERSION=(\d+\.\d+\.\d+)\s*$/m.exec(readFileSync(file, 'utf8'))?.[1];
}

/**
 * Where the launcher comes from: `launcher.path` (or `RIG_LAUNCHER_PATH`), else
 * a release: `launcher.version`, else the version of the runners image, else a default.
 */
export function launcherSource(config: GlobalConfig, repoRoot: string | undefined): LauncherSource {
	const path = launcherCheckout(config);
	if (path) return { kind: 'checkout', path };
	if (config.launcher.version) {
		return { kind: 'release', version: config.launcher.version, versionFrom: 'global config' };
	}
	const pinned = versionFromCheckout(repoRoot);
	if (pinned) return { kind: 'release', version: pinned, versionFrom: 'runners image' };
	return { kind: 'release', version: DEFAULT_LAUNCHER_VERSION, versionFrom: 'default' };
}

/** The cached binary of a release. */
export function releaseBinaryPath(version: string): string {
	return join(cacheDir(), 'launcher', version, BINARY_NAME);
}

/** How rig gets a release on this machine: a download, or a build from source with Go. */
export function releaseMethod(): 'download' | 'build' {
	return process.platform === 'linux' && RELEASE_ARCHES[process.arch] ? 'download' : 'build';
}

function newestGoSource(dir: string): number {
	if (!existsSync(dir)) return 0;
	let newest = 0;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			newest = Math.max(newest, newestGoSource(path));
		} else if (entry.name.endsWith('.go') || entry.name === 'go.mod' || entry.name === 'go.sum') {
			newest = Math.max(newest, statSync(path).mtimeMs);
		}
	}
	return newest;
}

function run(command: string, args: string[], cwd: string, what: string, hint: string): void {
	const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
	if (result.error || result.status !== 0) {
		const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
		throw new RigError(`Cannot ${what}: ${result.error?.message ?? output}`, hint);
	}
}

/** Builds a local checkout with `make build` when the binary is older than the Go sources. */
function checkoutBinary(checkout: string, log: (message: string) => void): string {
	const setPath = `Run \`${RIG} config set launcher.path <path-to-task-runner-launcher-checkout>\`, or \`${RIG} config unset launcher.path\` to use a release.`;
	if (!existsSync(join(checkout, 'go.mod'))) {
		throw new RigError(`${checkout} is not a task runner launcher checkout.`, setPath);
	}
	const binary = join(checkout, CHECKOUT_BINARY);
	const sources = Math.max(
		newestGoSource(join(checkout, 'cmd')),
		newestGoSource(join(checkout, 'internal')),
		...['go.mod', 'go.sum']
			.map((name) => join(checkout, name))
			.filter((path) => existsSync(path))
			.map((path) => statSync(path).mtimeMs),
	);
	if (existsSync(binary) && statSync(binary).mtimeMs >= sources) return binary;

	log(`Building the task runner launcher in ${checkout}`);
	run(
		'make',
		['build'],
		checkout,
		'build the task runner launcher',
		'Check that Go is installed: `go version`.',
	);
	return binary;
}

async function download(url: string): Promise<Buffer> {
	let response: Response;
	try {
		response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
	} catch (error) {
		throw new RigError(
			`Cannot download ${url}: ${error instanceof Error ? error.message : String(error)}`,
			'Check the network connection.',
		);
	}
	if (!response.ok) {
		throw new RigError(
			`Cannot download ${url}: HTTP ${response.status}.`,
			response.status === 404 ? 'Check that the launcher version exists.' : undefined,
		);
	}
	return Buffer.from(await response.arrayBuffer());
}

/** Downloads the Linux release and checks it against its published SHA-256 sum. */
async function downloadRelease(version: string, workDir: string): Promise<string> {
	const arch = RELEASE_ARCHES[process.arch];
	const asset = `${BINARY_NAME}-${version}-linux-${arch}.tar.gz`;
	const base = `${REPOSITORY}/releases/download/${version}/${asset}`;
	const [archive, checksum] = await Promise.all([download(base), download(`${base}.sha256`)]);

	const expected = /^[a-f0-9]{64}/i.exec(checksum.toString('utf8').trim())?.[0]?.toLowerCase();
	const actual = createHash('sha256').update(archive).digest('hex');
	if (!expected || expected !== actual) {
		throw new RigError(
			`The checksum of ${asset} does not match (expected ${expected ?? 'unknown'}, got ${actual}).`,
			'Try again. If it fails again, report it to the launcher team.',
		);
	}

	const file = join(workDir, asset);
	writeFileSync(file, archive);
	run(
		'tar',
		['-xzf', file, BINARY_NAME],
		workDir,
		`extract ${asset}`,
		'Check that `tar` is installed.',
	);
	return join(workDir, BINARY_NAME);
}

/**
 * Builds a release from its source tarball. The releases contain only Linux
 * binaries, so this is the path on macOS. The tarball has no published
 * checksum; HTTPS from GitHub is the trust anchor.
 */
async function buildRelease(version: string, workDir: string): Promise<string> {
	if (spawnSync('go', ['version'], { stdio: 'ignore' }).status !== 0) {
		throw new RigError(
			`The task runner launcher ${version} needs Go to build on ${process.platform}.`,
			`Install Go (https://go.dev/dl/), or set \`${RIG} config set launcher.path <checkout>\`.`,
		);
	}
	const file = join(workDir, 'source.tar.gz');
	writeFileSync(file, await download(`${REPOSITORY}/archive/refs/tags/${version}.tar.gz`));
	run(
		'tar',
		['-xzf', file],
		workDir,
		'extract the launcher source',
		'Check that `tar` is installed.',
	);
	const sourceDir = readdirSync(workDir, { withFileTypes: true }).find((entry) =>
		entry.isDirectory(),
	);
	if (!sourceDir) throw new RigError('The launcher source tarball has no directory.');
	const output = join(workDir, BINARY_NAME);
	run(
		'go',
		['build', '-o', output, './cmd/launcher'],
		join(workDir, sourceDir.name),
		`build the task runner launcher ${version}`,
		'Check the Go installation: `go version`.',
	);
	return output;
}

const pending = new Map<string, Promise<string>>();

/** Returns the binary of a release. Downloads or builds it once into the cache. */
async function releaseBinary(version: string, log: (message: string) => void): Promise<string> {
	const target = releaseBinaryPath(version);
	if (existsSync(target)) return target;

	const inFlight = pending.get(version);
	if (inFlight) return await inFlight;

	const promise = (async () => {
		const method = releaseMethod();
		log(
			method === 'download'
				? `Downloading the task runner launcher ${version}`
				: `Building the task runner launcher ${version} from source (one time)`,
		);
		mkdirSync(join(cacheDir(), 'launcher'), { recursive: true });
		const workDir = mkdtempSync(join(cacheDir(), 'launcher', `.tmp-${version}-`));
		try {
			const built =
				method === 'download'
					? await downloadRelease(version, workDir)
					: await buildRelease(version, workDir);
			chmodSync(built, 0o755);
			mkdirSync(join(cacheDir(), 'launcher', version), { recursive: true });
			// A rename is atomic, so another rig process never sees a partial binary.
			renameSync(built, target);
			return target;
		} finally {
			rmSync(workDir, { recursive: true, force: true });
		}
	})();
	pending.set(version, promise);
	try {
		return await promise;
	} finally {
		pending.delete(version);
	}
}

/** Returns the launcher binary. Builds or downloads it when needed. */
export async function ensureLauncherBinary(
	source: LauncherSource,
	log: (message: string) => void,
): Promise<string> {
	if (source.kind === 'checkout') return checkoutBinary(source.path, log);
	return await releaseBinary(source.version, log);
}
