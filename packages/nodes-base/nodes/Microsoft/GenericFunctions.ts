import type { INode } from 'n8n-workflow';
import { NodeError, NodeOperationError } from 'n8n-workflow';

/**
 * Stamps `context.itemIndex` on a `NodeError` that does not carry one yet, so a
 * per-item failure (e.g. a bad Service Principal target resolved at item N) is
 * attributed to the right item. Never overwrites an existing index. Returns the
 * error for the caller to (re)throw.
 */
export function stampItemIndexOnError(error: unknown, itemIndex: number): unknown {
	if (error instanceof NodeError && error.context?.itemIndex === undefined) {
		error.context = { ...error.context, itemIndex };
	}
	return error;
}

/**
 * Overridable throw-site copy for {@link validateUserTargetId}. Messages are static
 * (they never interpolate the id) so a caller only swaps wording — e.g. Outlook uses
 * "mailbox" phrasing. Defaults to the To Do "target ID" copy.
 */
export interface UserTargetMessages {
	required: { message: string; description: string };
	dotsOnly: { message: string; description: string };
	invalid: { message: string; description: string };
}

// App-only Microsoft Graph has no `/me`, so a user-scoped request is addressed under an
// explicit `/users/{id}` root. A user is only a user object ID (GUID) or a UPN (has `@`);
// there is no bare host/domain form. The UPN local part is Entra's documented
// userPrincipalName set (A-Z a-z 0-9 ' . - _ ! # ^ ~) plus `+`, and covers B2B guest UPNs
// (`user_contoso.com#EXT#@tenant.onmicrosoft.com`). It excludes `%`, so an encoded-traversal
// payload like `..%2f..%2fx@y.com` is rejected; for the rest, `encodeURIComponent` makes
// `#`/`^` path-safe (`%23`/`%5E`) before they reach the URL. Kept module-local (not exported)
// so this throwing validator stays the single interpolation gate — a caller cannot compose
// its own check, mis-order it, and interpolate an unvalidated value.
const USER_TARGET_GUID = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;
const USER_TARGET_UPN = /^[A-Za-z0-9._+'!#^~-]+@[A-Za-z0-9.-]+$/;

const DEFAULT_MESSAGES: UserTargetMessages = {
	required: {
		message: 'A target ID is required for the Service Principal',
		description:
			'Set the User ID under "Access As" — app-only Microsoft Graph has no personal context to default to.',
	},
	dotsOnly: {
		message: 'The target ID is not valid',
		description: 'A target ID cannot consist only of dots.',
	},
	invalid: {
		message: 'The target ID is not valid',
		description: 'Remove any slashes, backslashes, colons, commas, or spaces and try again.',
	},
};

/**
 * Validates an app-only user target id before it is encoded and used to compose a Graph
 * URL. Throws a `NodeOperationError` with a fully static message (never interpolating the
 * id). The id shape is validated BEFORE encoding — `encodeURIComponent` leaves `..` intact,
 * so shape validation (not encoding) is what keeps the value safe to interpolate into a
 * Graph URL path. Order: empty → dots-only → accepted user shapes (GUID / UPN). Callers
 * trim the id before calling. Pass `messages` to override the throw-site copy (e.g. Outlook
 * "mailbox" wording); it defaults to the To Do "target ID" copy.
 */
export function validateUserTargetId(
	id: string,
	node: INode,
	messages: UserTargetMessages = DEFAULT_MESSAGES,
): void {
	if (id === '') {
		throw new NodeOperationError(node, messages.required.message, {
			description: messages.required.description,
		});
	}
	if (/^\.+$/.test(id)) {
		throw new NodeOperationError(node, messages.dotsOnly.message, {
			description: messages.dotsOnly.description,
		});
	}
	const valid = USER_TARGET_GUID.test(id) || USER_TARGET_UPN.test(id);
	if (!valid) {
		throw new NodeOperationError(node, messages.invalid.message, {
			description: messages.invalid.description,
		});
	}
}
