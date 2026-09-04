import type { INode, ResolvedFilePath } from 'n8n-workflow';
import { NodeOperationError, OperationalError } from 'n8n-workflow';
import { isAbsolute, parse, sep } from 'node:path';
import type { ConfigListSummary, SimpleGit } from 'simple-git';

const FILTER_COMMAND_CONFIG_KEY_PATTERN = /^filter\.(.*)\.(?:clean|smudge|process)$/i;

const MERGE_DRIVER_CONFIG_KEY_PATTERN = /^merge\.(.*)\.driver$/i;

const REMOTE_PACK_COMMAND_CONFIG_KEY_PATTERN = /^remote\.(.*)\.(?:uploadpack|receivepack)$/i;

const GPG_FORMAT_PROGRAM_CONFIG_KEY_PATTERN = /^gpg\.(.*)\.program$/i;

const CORE_ASKPASS_CONFIG_KEY_PATTERN = /^core\.askpass$/i;

const CORE_EDITOR_CONFIG_KEY_PATTERN = /^core\.editor$/i;

const CORE_ALTERNATE_REFS_COMMAND_CONFIG_KEY_PATTERN = /^core\.alternaterefscommand$/i;

const GC_RECENT_OBJECTS_HOOK_CONFIG_KEY_PATTERN = /^gc\.recentobjectshook$/i;

const CONFIGURED_HOOK_COMMAND_CONFIG_KEY_PATTERN = /^hook\.(.*)\.command$/i;

const SEQUENCE_EDITOR_CONFIG_KEY_PATTERN = /^sequence\.editor$/i;

const GPG_SSH_DEFAULT_KEY_COMMAND_CONFIG_KEY_PATTERN = /^gpg\.ssh\.defaultkeycommand$/i;

const URL_REWRITE_CONFIG_KEY_PATTERN = /^url\.(.*)\.(?:insteadof|pushinsteadof)$/i;

const KEY_BLACKLIST = [
	FILTER_COMMAND_CONFIG_KEY_PATTERN,
	MERGE_DRIVER_CONFIG_KEY_PATTERN,
	REMOTE_PACK_COMMAND_CONFIG_KEY_PATTERN,
	GPG_FORMAT_PROGRAM_CONFIG_KEY_PATTERN,
	CORE_ASKPASS_CONFIG_KEY_PATTERN,
	CORE_EDITOR_CONFIG_KEY_PATTERN,
	CORE_ALTERNATE_REFS_COMMAND_CONFIG_KEY_PATTERN,
	GC_RECENT_OBJECTS_HOOK_CONFIG_KEY_PATTERN,
	CONFIGURED_HOOK_COMMAND_CONFIG_KEY_PATTERN,
	SEQUENCE_EDITOR_CONFIG_KEY_PATTERN,
	GPG_SSH_DEFAULT_KEY_COMMAND_CONFIG_KEY_PATTERN,
	URL_REWRITE_CONFIG_KEY_PATTERN,
];

export function findBlacklistedKeys(
	config: ConfigListSummary,
	localConfigFiles: string[],
): string[] {
	const localConfigFileSet = new Set(localConfigFiles);
	const localConfigIndex = config.files.findIndex((file) => localConfigFileSet.has(file));
	if (localConfigIndex === -1) {
		return [];
	}

	// Scan config sources from repository-local config onward.
	const repositoryConfigFiles = config.files.slice(localConfigIndex);
	const forbiddenKeys = new Set<string>();

	for (const file of repositoryConfigFiles) {
		for (const key of Object.keys(config.values[file] ?? {})) {
			if (KEY_BLACKLIST.some((pattern) => pattern.test(key))) {
				forbiddenKeys.add(key);
			}
		}
	}

	return Array.from(forbiddenKeys);
}

/**
 * Shared safeguards for git references: block argument injection, path
 * traversal, and control characters. The caller supplies the allowed-character
 * whitelist so tags (which permit `+`) can be validated less strictly than
 * branch/ref names without weakening the injection protections.
 */
function assertSafeGitReference(
	reference: string,
	node: INode,
	safeReferencePattern: RegExp,
	allowedCharsMessage: string,
): void {
	if (!safeReferencePattern.test(reference)) {
		throw new NodeOperationError(
			node,
			`Invalid reference format. Reference contains unsafe characters. Only alphanumeric characters and ${allowedCharsMessage} are allowed`,
		);
	}

	// Prevent argument injection by blocking references starting with -
	if (reference.startsWith('-')) {
		throw new NodeOperationError(
			node,
			'Invalid reference format. Reference cannot start with a hyphen',
		);
	}

	// Prevent path traversal attempts
	if (reference.includes('..')) {
		throw new NodeOperationError(node, 'Invalid reference format. Reference cannot contain ".."');
	}

	// Prevent control characters that could be used for injection
	// eslint-disable-next-line no-control-regex
	if (/[\x00-\x1f\x7f]/.test(reference)) {
		throw new NodeOperationError(
			node,
			'Invalid reference format. Reference cannot contain control characters',
		);
	}
}

/**
 * Validates a git reference to prevent command injection attacks
 * @param reference - The git reference to validate (e.g., branch name, HEAD, refs/heads/main)
 * @param node - The node instance for error throwing
 * @throws {NodeOperationError} If the reference contains unsafe characters or patterns
 */
export function validateGitReference(reference: string, node: INode): void {
	// Allow only safe characters: alphanumeric, /, @, {, }, ., -, _, :
	assertSafeGitReference(reference, node, /^[a-zA-Z0-9/@{}._:-]+$/, '/@{}._:-');
}

/**
 * Validates a git tag name. Tags follow git's ref-format rules, which permit
 * `+` (e.g. SemVer build metadata like `v1.2.3+build.1`), so the whitelist is
 * a superset of `validateGitReference` while keeping the same safeguards.
 * @param name - The tag name to validate
 * @param node - The node instance for error throwing
 * @throws {NodeOperationError} If the tag name contains unsafe characters or patterns
 */
export function validateGitTag(name: string, node: INode): void {
	assertSafeGitReference(name, node, /^[a-zA-Z0-9/@{}._:+-]+$/, '/@{}._:+-');
}

// Git accepts a URL or a path anywhere it accepts a remote name, so a name is held to
// git's own rule for one (`check_refname_format`) plus no leading `-` or `/`.
const UNSAFE_REMOTE_NAME_PATTERN = /^[-./]|[\\:~^?*[\s\x00-\x1f\x7f]|\.\.|\/\/|\/$/;

const isValidRemoteName = (name: string) =>
	name === '.' || (name.length > 0 && !UNSAFE_REMOTE_NAME_PATTERN.test(name));

export function validateGitRemoteName(name: string, node: INode): void {
	if (!isValidRemoteName(name)) {
		throw new NodeOperationError(
			node,
			`Invalid remote name '${name}'. This field takes the name of a remote, not a URL or a path`,
		);
	}
}
export interface GitRepositoryLayout {
	/** `--show-toplevel`, or undefined when git reports no work tree. */
	topLevel: string | undefined;
	/** `--absolute-git-dir`: the per-worktree git directory. */
	gitDir: string;
	/** `--git-common-dir`, printed relative to git's cwd. */
	commonDir: string;
}

/**
 * A repository path containing a newline makes git print an extra line, so take the line
 * count as given rather than reading positionally: picking up the wrong value here would
 * silently point the callers' checks at the wrong directory.
 */
function parseRevParseOutput(output: string, expectedLineCount: number): string[] {
	const lines = output.split('\n');
	if (lines[lines.length - 1] === '') {
		lines.pop();
	}

	// Windows forbids a carriage return in a filename, so there it can only be a line
	// terminator. POSIX allows it, and stripping it would name a different directory.
	const paths = process.platform === 'win32' ? lines.map((line) => line.replace(/\r$/, '')) : lines;
	if (paths.length !== expectedLineCount || paths.some((path) => path === '')) {
		throw new OperationalError('Could not read the git repository layout');
	}

	return paths;
}

/**
 * git prints these absolute, and callers hand them straight to `resolvePath`, where a relative
 * value would resolve against n8n's own working directory instead.
 */
function assertAbsolutePaths(paths: string[], cause?: unknown): void {
	if (paths.some((path) => !isAbsolute(path))) {
		throw new OperationalError('Could not read the git repository layout', { cause });
	}
}

// Asks git where the repository it discovered actually lives.
export async function getGitRepositoryLayout(git: SimpleGit): Promise<GitRepositoryLayout> {
	let workTreeError: unknown;
	const workTreeOutput = await git
		.raw(['rev-parse', '--show-toplevel', '--absolute-git-dir', '--git-common-dir'])
		.catch((error: unknown) => {
			workTreeError = error;
			return undefined;
		});

	if (workTreeOutput !== undefined) {
		const [topLevel, gitDir, commonDir] = parseRevParseOutput(workTreeOutput, 3);
		assertAbsolutePaths([topLevel, gitDir]);
		return { topLevel, gitDir, commonDir };
	}

	// The call above also fails for reasons other than "no work tree" (a spawn failure, an
	// ownership refusal), so make git confirm there is none rather than assuming it.
	const fallbackOutput = await git
		.raw(['rev-parse', '--absolute-git-dir', '--git-common-dir', '--is-inside-work-tree'])
		.catch((error: unknown) => {
			throw new OperationalError(
				error instanceof Error ? error.message : 'Could not read the git repository layout',
				{ cause: workTreeError },
			);
		});

	const [gitDir, commonDir, isInsideWorkTree] = parseRevParseOutput(fallbackOutput, 3);
	assertAbsolutePaths([gitDir], workTreeError);
	if (isInsideWorkTree !== 'false') {
		throw new OperationalError('Could not read the git repository layout', {
			cause: workTreeError,
		});
	}

	return { topLevel: undefined, gitDir, commonDir };
}

/**
 * Whole-component path containment. `parent` may be a filesystem root, which already ends in a
 * separator, so appending another one would never match.
 *
 * Both arguments must be resolved absolute paths. This is a pure string test: it does not
 * normalise `..`, a trailing separator or an empty `parent`.
 */
export function isWithinPath(parent: string, candidate: string): boolean {
	if (candidate === parent) {
		return true;
	}

	return candidate.startsWith(parent.endsWith(sep) ? parent : parent + sep);
}

/**
 * The directory owning a git directory: `<top>` for both `<top>/.git` and
 * `<top>/.git/modules/<name>`. Callers need it because the default allowed-path patterns
 * reject every path with a `.git` component.
 */
export function ownerOfGitDir(gitDirPath: ResolvedFilePath): ResolvedFilePath {
	const components = gitDirPath.split(sep);
	const gitIndex = components.lastIndexOf('.git');
	if (gitIndex === -1) {
		return gitDirPath;
	}

	// Floor at the filesystem root, for a repository whose git dir sits directly under it.
	// Ancestors of a realpath'd path are themselves resolved, so the cast is sound.
	const { root } = parse(gitDirPath);
	const owner = components.slice(0, gitIndex).join(sep);
	return (owner.length > root.length ? owner : root) as ResolvedFilePath;
}
const REMOTE_ORIGIN_URL_KEY = 'remote.origin.url';

const REMOTE_ORIGIN_PUSH_URL_KEY = 'remote.origin.pushurl';

const REMOTE_CONFIG_KEY_PATTERN = /^remote\.(.+)\.(url|pushurl)$/i;

// Git resolves these against the configured remotes and, failing that, uses the value
// itself as a repository URL or path.
const BRANCH_REMOTE_CONFIG_KEY_PATTERN = /^branch\..+\.(remote|pushremote)$/i;

const REMOTE_PUSH_DEFAULT_CONFIG_KEY_PATTERN = /^remote\.pushdefault$/i;

export type GitRepositoryType = 'source' | 'target';

export interface ConfiguredRemoteRepositories {
	sourceValidationTargets: string[];
	targetValidationTargets: string[];
	pushTarget: string | undefined;
}

export function getRepositoryTypeForRemoteConfigKey(key: string): GitRepositoryType | undefined {
	const match = REMOTE_CONFIG_KEY_PATTERN.exec(key);
	if (match) {
		return match[2].toLowerCase() === 'pushurl' ? 'target' : 'source';
	}

	const branchMatch = BRANCH_REMOTE_CONFIG_KEY_PATTERN.exec(key);
	if (branchMatch) {
		return branchMatch[1].toLowerCase() === 'pushremote' ? 'target' : 'source';
	}

	return REMOTE_PUSH_DEFAULT_CONFIG_KEY_PATTERN.test(key) ? 'target' : undefined;
}

const toArray = (value: string | string[]) => (Array.isArray(value) ? value : [value]);

function addRemoteValue(
	remoteValuesByName: Map<string, string[]>,
	remoteName: string,
	value: string,
) {
	const existingValues = remoteValuesByName.get(remoteName) ?? [];
	existingValues.push(value);
	remoteValuesByName.set(remoteName, existingValues);
}

export function getConfiguredRemoteRepositories(
	configValues: Record<string, Record<string, string | string[] | undefined>>,
	node: INode,
): ConfiguredRemoteRepositories {
	const sourceValidationTargets: string[] = [];
	const targetValidationTargets: string[] = [];
	const remoteOriginUrls: string[] = [];
	const remoteOriginPushUrls: string[] = [];
	const remoteUrlsByName = new Map<string, string[]>();
	const remotePushUrlsByName = new Map<string, string[]>();
	const configuredRemoteNames = new Set<string>();
	const sourceRemoteReferences: string[] = [];
	const targetRemoteReferences: string[] = [];

	for (const values of Object.values(configValues)) {
		for (const [key, value] of Object.entries(values)) {
			if (value === undefined) {
				continue;
			}

			const match = REMOTE_CONFIG_KEY_PATTERN.exec(key);
			if (match !== null) {
				if (typeof value !== 'string') {
					throw new NodeOperationError(node, 'Target repository is required');
				}

				const remoteName = match[1].toLowerCase();
				const repositoryType = match[2].toLowerCase();

				const normalizedKey = key.toLowerCase();
				if (repositoryType === 'pushurl') {
					addRemoteValue(remotePushUrlsByName, remoteName, value);
					if (normalizedKey === REMOTE_ORIGIN_PUSH_URL_KEY) {
						remoteOriginPushUrls.push(value);
					}
				} else {
					sourceValidationTargets.push(value);
					addRemoteValue(remoteUrlsByName, remoteName, value);
					if (isValidRemoteName(match[1])) {
						configuredRemoteNames.add(match[1]);
					}
				}

				if (normalizedKey === REMOTE_ORIGIN_URL_KEY) {
					remoteOriginUrls.push(value);
				}

				continue;
			}

			const repositoryType = getRepositoryTypeForRemoteConfigKey(key);
			if (repositoryType === 'source') {
				sourceRemoteReferences.push(...toArray(value));
			} else if (repositoryType === 'target') {
				targetRemoteReferences.push(...toArray(value));
			}
		}
	}

	const remoteNames = new Set([...remoteUrlsByName.keys(), ...remotePushUrlsByName.keys()]);
	for (const remoteName of remoteNames) {
		const remoteUrls = remoteUrlsByName.get(remoteName) ?? [];
		const remotePushUrls = remotePushUrlsByName.get(remoteName);
		targetValidationTargets.push.apply(targetValidationTargets, remotePushUrls ?? remoteUrls);
	}

	// A reference naming a configured remote is covered by that remote's own URLs above.
	// A branch's fetch remote is also where a push lands when it has no push remote.
	const unresolved = (references: string[]) =>
		references.filter((reference) => !configuredRemoteNames.has(reference));

	const unresolvedSourceReferences = unresolved(sourceRemoteReferences);
	sourceValidationTargets.push(...unresolvedSourceReferences);
	targetValidationTargets.push(
		...unresolvedSourceReferences,
		...unresolved(targetRemoteReferences),
	);

	return {
		sourceValidationTargets,
		targetValidationTargets,
		pushTarget: remoteOriginPushUrls[0] ?? remoteOriginUrls[0],
	};
}

function sanitizeUrl(url: string): string {
	const urlObj = new URL(url);
	urlObj.username = '';
	urlObj.password = '';
	return urlObj.toString();
}

export function mapGitConfigList(config: ConfigListSummary) {
	const data = [];
	for (const fileName of Object.keys(config.values)) {
		let remoteOriginUrl = config.values[fileName][REMOTE_ORIGIN_URL_KEY];
		if (remoteOriginUrl) {
			if (Array.isArray(remoteOriginUrl)) {
				remoteOriginUrl = remoteOriginUrl.map(sanitizeUrl);
			} else {
				remoteOriginUrl = sanitizeUrl(remoteOriginUrl);
			}
		}

		let remoteOriginPushUrl = config.values[fileName][REMOTE_ORIGIN_PUSH_URL_KEY];
		if (remoteOriginPushUrl) {
			if (Array.isArray(remoteOriginPushUrl)) {
				remoteOriginPushUrl = remoteOriginPushUrl.map(sanitizeUrl);
			} else {
				remoteOriginPushUrl = sanitizeUrl(remoteOriginPushUrl);
			}
		}

		data.push({
			_file: fileName,
			...config.values[fileName],
			[REMOTE_ORIGIN_URL_KEY]: remoteOriginUrl,
			[REMOTE_ORIGIN_PUSH_URL_KEY]: remoteOriginPushUrl,
		});
	}
	return data;
}
