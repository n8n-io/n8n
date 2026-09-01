import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { ConfigListSummary } from 'simple-git';

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

const REMOTE_ORIGIN_URL_KEY = 'remote.origin.url';

const REMOTE_ORIGIN_PUSH_URL_KEY = 'remote.origin.pushurl';

const REMOTE_CONFIG_KEY_PATTERN = /^remote\.(.+)\.(url|pushurl)$/i;

export type GitRepositoryType = 'source' | 'target';

export interface ConfiguredRemoteRepositories {
	sourceValidationTargets: string[];
	targetValidationTargets: string[];
	pushTarget: string | undefined;
}

export function getRepositoryTypeForRemoteConfigKey(key: string): GitRepositoryType | undefined {
	const match = REMOTE_CONFIG_KEY_PATTERN.exec(key);

	if (!match) {
		return undefined;
	}

	return match[2].toLowerCase() === 'pushurl' ? 'target' : 'source';
}

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

	for (const values of Object.values(configValues)) {
		for (const [key, value] of Object.entries(values)) {
			const match = REMOTE_CONFIG_KEY_PATTERN.exec(key);
			if (value === undefined || match === null) {
				continue;
			}

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
			}

			if (normalizedKey === REMOTE_ORIGIN_URL_KEY) {
				remoteOriginUrls.push(value);
			}
		}
	}

	const remoteNames = new Set([...remoteUrlsByName.keys(), ...remotePushUrlsByName.keys()]);
	for (const remoteName of remoteNames) {
		const remoteUrls = remoteUrlsByName.get(remoteName) ?? [];
		const remotePushUrls = remotePushUrlsByName.get(remoteName);
		targetValidationTargets.push.apply(targetValidationTargets, remotePushUrls ?? remoteUrls);
	}

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
