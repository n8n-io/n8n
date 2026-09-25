import { NodeOperationError, type INode } from 'n8n-workflow';

import {
	stampItemIndexOnError,
	validateUserTargetId,
	type UserTargetMessages,
} from '../GenericFunctions';

const node: INode = {
	id: 'test-node',
	name: 'Microsoft Node',
	type: 'n8n-nodes-base.microsoft',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

// The Outlook-style override; used to prove `messages` swaps the copy at every throw site
// without touching the accepted-shape logic.
const MAILBOX_MESSAGES: UserTargetMessages = {
	required: {
		message: 'A mailbox is required for the Service Principal',
		description:
			'Set the Mailbox — app-only Microsoft Graph has no personal mailbox to default to.',
	},
	dotsOnly: {
		message: 'The mailbox is not valid',
		description: 'A mailbox cannot consist only of dots.',
	},
	invalid: {
		message: 'The mailbox is not valid',
		description: 'Enter a user principal name (UPN) or object ID and try again.',
	},
};

describe('Microsoft shared validateUserTargetId', () => {
	describe('accepted shapes (widened Entra UPN set + B2B guest)', () => {
		it.each([
			['a GUID', '11111111-1111-1111-1111-111111111111'],
			['a plain UPN', 'jane@contoso.com'],
			['an apostrophe UPN', "o'connor@contoso.com"],
			['a "+" sub-address UPN', 'jane+test@contoso.com'],
			['a "!" UPN', 'o!brien@contoso.com'],
			['a "^" UPN', 'joe^smith@contoso.com'],
			['a "~" UPN', 'jane~doe@contoso.com'],
			['a "#" UPN (has @)', 'a#b@contoso.com'],
			['a B2B guest #EXT# UPN', 'user_contoso.com#EXT#@tenant.onmicrosoft.com'],
		])('accepts %s', (_label, id) => {
			expect(() => validateUserTargetId(id, node)).not.toThrow();
		});
	});

	describe('rejected shapes', () => {
		it.each([
			['empty', ''],
			['a single dot', '.'],
			['two dots', '..'],
			['three dots', '...'],
			['a forward slash', 'a/b'],
			['a backslash', 'a\\b'],
			['a colon', 'a:b'],
			['a space', 'a b@contoso.com'],
			['a question mark', 'a?b'],
			['a bare host', 'contoso.com'],
			['a bare label', 'jane'],
			['a legal-but-user-invalid host', 'sub.contoso.co.uk'],
			['an encoded traversal UPN', '..%2f..%2fx@y.com'],
			['an encoded dots-only', '%2e%2e'],
			['a "#" without @', 'a#b'],
			['a drive-shaped "!" id (no @)', 'b!abc'],
		])('rejects %s', (_label, id) => {
			expect(() => validateUserTargetId(id, node)).toThrow(NodeOperationError);
		});
	});

	describe('default messages (To Do "target ID" copy) at each throw site', () => {
		it('required: empty id', () => {
			expect(() => validateUserTargetId('', node)).toThrow(
				'A target ID is required for the Service Principal',
			);
		});

		it('dotsOnly: dots-only id', () => {
			let caught: NodeOperationError | undefined;
			try {
				validateUserTargetId('..', node);
			} catch (error) {
				caught = error as NodeOperationError;
			}
			expect(caught?.message).toBe('The target ID is not valid');
			expect(caught?.description).toBe('A target ID cannot consist only of dots.');
		});

		it('invalid: bad-shape id', () => {
			let caught: NodeOperationError | undefined;
			try {
				validateUserTargetId('a/b', node);
			} catch (error) {
				caught = error as NodeOperationError;
			}
			expect(caught?.message).toBe('The target ID is not valid');
			expect(caught?.description).toBe(
				'Remove any slashes, backslashes, colons, commas, or spaces and try again.',
			);
		});
	});

	describe('overridden messages (Outlook "mailbox" copy) at each throw site', () => {
		it('required: empty id', () => {
			let caught: NodeOperationError | undefined;
			try {
				validateUserTargetId('', node, MAILBOX_MESSAGES);
			} catch (error) {
				caught = error as NodeOperationError;
			}
			expect(caught?.message).toBe('A mailbox is required for the Service Principal');
			expect(caught?.description).toBe(MAILBOX_MESSAGES.required.description);
		});

		it('dotsOnly: dots-only id uses the mailbox variant (no "target ID" leakage)', () => {
			let caught: NodeOperationError | undefined;
			try {
				validateUserTargetId('..', node, MAILBOX_MESSAGES);
			} catch (error) {
				caught = error as NodeOperationError;
			}
			expect(caught?.message).toBe('The mailbox is not valid');
			expect(caught?.description).toBe('A mailbox cannot consist only of dots.');
		});

		it('invalid: bad-shape id', () => {
			let caught: NodeOperationError | undefined;
			try {
				validateUserTargetId('a/b', node, MAILBOX_MESSAGES);
			} catch (error) {
				caught = error as NodeOperationError;
			}
			expect(caught?.message).toBe('The mailbox is not valid');
			expect(caught?.description).toBe(MAILBOX_MESSAGES.invalid.description);
		});
	});

	describe('the rejected id is never echoed in the message or description', () => {
		it.each<[string, UserTargetMessages | undefined]>([
			['default messages', undefined],
			['overridden messages', MAILBOX_MESSAGES],
		])('%s', (_label, messages) => {
			const evil = 'evil/../%2fsecret@attacker.com';
			let caught: NodeOperationError | undefined;
			try {
				validateUserTargetId(evil, node, messages);
			} catch (error) {
				caught = error as NodeOperationError;
			}
			expect(caught).toBeDefined();
			expect(caught?.message).not.toContain('evil');
			expect(caught?.message).not.toContain('secret');
			expect(caught?.message).not.toContain('..');
			expect(caught?.message).not.toContain('%2');
			expect(caught?.description).not.toContain('evil');
			expect(caught?.description).not.toContain('secret');
			expect(caught?.description).not.toContain('%2');
		});
	});
});

describe('Microsoft shared stampItemIndexOnError', () => {
	it('stamps context.itemIndex on a NodeError that lacks one, preserving other context keys', () => {
		const error = new NodeOperationError(node, 'boom');
		error.context.foo = 'bar';

		expect(stampItemIndexOnError(error, 3)).toBe(error);
		expect(error.context.itemIndex).toBe(3);
		expect(error.context.foo).toBe('bar');
	});

	it('does not overwrite an already-set context.itemIndex', () => {
		const error = new NodeOperationError(node, 'boom', { itemIndex: 5 });

		expect(stampItemIndexOnError(error, 9)).toBe(error);
		expect(error.context.itemIndex).toBe(5);
	});

	it('returns a plain (non-Node) Error as-is, unstamped', () => {
		const error = new Error('boom');

		expect(stampItemIndexOnError(error, 3)).toBe(error);
		expect((error as { context?: unknown }).context).toBeUndefined();
	});
});
