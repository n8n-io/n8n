import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { ConfigListSummary } from 'simple-git';

/**
 * Validates a git reference to prevent command injection attacks
 * @param reference - The git reference to validate (e.g., branch name, HEAD, refs/heads/main)
 * @param node - The node instance for error throwing
 * @throws {NodeOperationError} If the reference contains unsafe characters or patterns
 */
export function validateGitReference(reference: string, node: INode): void {
	// Allow only safe characters: alphanumeric, /, @, {, }, ., -, _, :
	const safeReferencePattern = /^[a-zA-Z0-9/@{}._:-]+$/;

	if (!safeReferencePattern.test(reference)) {
		throw new NodeOperationError(
			node,
			'Invalid reference format. Reference contains unsafe characters. Only alphanumeric characters and /@{}._:- are allowed',
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

const REMOTE_ORIGIN_URL_KEY = 'remote.origin.url';

const REMOTE_ORIGIN_PUSH_URL_KEY = 'remote.origin.pushurl';

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
