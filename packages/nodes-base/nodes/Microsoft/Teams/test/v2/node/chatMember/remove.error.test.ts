import {
	NodeApiError,
	NodeOperationError,
	type IExecuteFunctions,
	type INode,
	type NodeParameterValueType,
} from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import { versionDescription } from '../../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';

/**
 * The transport is NOT mocked here: the 403 rewrite keys off the `NodeApiError` the
 * real transport builds, so the rejection is injected at the request-library layer
 * to prove the whole chain, not just that the code branches on a hand-set property.
 */
describe('Microsoft Teams V2 — chatMember:remove error surfacing', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;
	let requestOAuth2: Mock;

	const graphError = (statusCode: number, code: string, message: string) =>
		Object.assign(new Error(`${statusCode}`), {
			statusCode,
			error: { error: { code, message } },
		});

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown): NodeParameterValueType =>
				(name in params ? params[name] : fallback) as NodeParameterValueType,
		);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = mock<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.getInstanceId.mockReturnValue('instanceId');
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		ctx.continueOnFail.mockReturnValue(false);
		// Without this the real transport throws a TypeError before reaching
		// requestOAuth2, and a bare rejects.toThrow() would pass on that instead.
		ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
		requestOAuth2 = vi.fn();
		ctx.helpers.requestOAuth2 = requestOAuth2;
		setParams({
			authentication: 'microsoftTeamsOAuth2Api',
			resource: 'chatMember',
			operation: 'remove',
			chatId: '19:abc@thread.v2',
			membershipId: 'MCMjMiMj',
		});
	});

	it('a 403 is rewritten with a description naming ChatMember.ReadWrite and the reconnect', async () => {
		requestOAuth2.mockRejectedValue(
			graphError(
				403,
				'Authorization_RequestDenied',
				'Insufficient privileges to complete the operation.',
			),
		);

		const error = await node.execute.call(ctx).catch((e: Error) => e);

		expect(error).toBeInstanceOf(NodeOperationError);
		// Graph's own text stays the message: a 403 here is not necessarily a scope problem.
		expect(error.message).toContain('Insufficient privileges to complete the operation.');
		const { description } = error as NodeOperationError;
		expect(description).toContain('ChatMember.ReadWrite');
		expect(description).toContain('reconnect');
		expect(description).toContain('Enabled Scopes');
		expect(requestOAuth2).toHaveBeenCalledTimes(1);
	});

	it('a 404 passes through unchanged', async () => {
		requestOAuth2.mockRejectedValue(
			graphError(404, 'itemNotFound', 'The requested item was not found.'),
		);

		const error = await node.execute.call(ctx).catch((e: Error) => e);

		expect(error).toBeInstanceOf(NodeApiError);
		expect((error as NodeApiError).httpCode).toBe('404');
		expect(error.message).toContain('The requested item was not found.');
		expect(requestOAuth2).toHaveBeenCalledTimes(1);
	});
});
