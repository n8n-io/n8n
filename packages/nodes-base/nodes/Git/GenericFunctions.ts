import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

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
