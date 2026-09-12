import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';

import { versionDescription } from '../../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import * as transport from '../../../../v2/transport';
import type * as transportModule from '../../../../v2/transport';
import { createExecuteContext, setParams } from '../helpers';

vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof transportModule>('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const chatId = '19:abc@thread.v2';
const messageId = '1698378560692';
const userId = '11111-2222-3333';

describe.each<[string, string]>([['softDeleteMessage', 'softDelete']])(
	'Microsoft Teams V2 — chatMessage:%s',
	(operation, action) => {
		const actionPath = `/v1.0/users/${userId}/chats/${chatId}/messages/${messageId}/${action}`;
		const apiRequest = vi.mocked(transport.microsoftApiRequest);
		let node: MicrosoftTeamsV2;
		let ctx: MockProxy<IExecuteFunctions>;

		const expectMeCall = (n: number) =>
			expect(apiRequest).toHaveBeenNthCalledWith(n, 'GET', '/v1.0/me', {}, { $select: 'id' });

		beforeEach(() => {
			vi.resetAllMocks();
			node = new MicrosoftTeamsV2(versionDescription);
			ctx = createExecuteContext();
		});

		const run = async (params: Record<string, unknown> = {}) => {
			setParams(ctx, {
				authentication: 'microsoftTeamsOAuth2Api',
				resource: 'chatMessage',
				operation,
				chatId,
				messageId,
				...params,
			});
			return await node.execute.call(ctx);
		};

		it('resolves the signed-in user and then posts the action path', async () => {
			apiRequest.mockResolvedValueOnce({ id: userId }).mockResolvedValueOnce(undefined);

			const result = await run();

			expect(apiRequest).toHaveBeenCalledTimes(2);
			expectMeCall(1);
			expect(apiRequest).toHaveBeenNthCalledWith(2, 'POST', actionPath);
			expect(result).toEqual([[{ json: { success: true }, pairedItem: { item: 0 } }]]);
		});

		it('accepts a numeric message ID from an expression', async () => {
			apiRequest.mockResolvedValueOnce({ id: userId }).mockResolvedValueOnce(undefined);

			await run({ messageId: 1698378560692 });

			expect(apiRequest).toHaveBeenCalledTimes(2);
			expectMeCall(1);
			expect(apiRequest).toHaveBeenNthCalledWith(2, 'POST', actionPath);
		});

		it('resolves the signed-in user once for each input item', async () => {
			ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
			apiRequest
				.mockResolvedValueOnce({ id: userId })
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce({ id: userId })
				.mockResolvedValueOnce(undefined);

			await run();

			expect(apiRequest).toHaveBeenCalledTimes(4);
			expectMeCall(1);
			expect(apiRequest).toHaveBeenNthCalledWith(2, 'POST', actionPath);
			expectMeCall(3);
			expect(apiRequest).toHaveBeenNthCalledWith(4, 'POST', actionPath);
		});

		it.each([
			['chat', { chatId: 'a/b' }],
			['message', { messageId: 'a/b' }],
		])('rejects a malformed %s ID before any request', async (_label, params) => {
			await expect(run(params)).rejects.toThrow('The ID is not valid');
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it('rejects an empty message ID before any request', async () => {
			await expect(run({ messageId: '' })).rejects.toThrow('A required ID is empty');
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it.each([
			['no ID', {}],
			['an empty ID', { id: '' }],
		])('fails when the signed-in user has %s', async (_label, user) => {
			apiRequest.mockResolvedValueOnce(user);

			await expect(run()).rejects.toThrow('Could not resolve the signed-in user');
			expect(apiRequest).toHaveBeenCalledTimes(1);
		});

		it('propagates a Graph error from the signed-in user request unchanged', async () => {
			const error = new NodeApiError(
				ctx.getNode(),
				{ message: 'Unauthorized' },
				{ httpCode: '401' },
			);
			apiRequest.mockRejectedValueOnce(error);

			await expect(run()).rejects.toBe(error);
			expect(apiRequest).toHaveBeenCalledTimes(1);
		});

		it('propagates a Graph error from the action request unchanged', async () => {
			const error = new NodeApiError(ctx.getNode(), { message: 'Not Found' }, { httpCode: '404' });
			apiRequest.mockResolvedValueOnce({ id: userId }).mockRejectedValueOnce(error);

			await expect(run()).rejects.toBe(error);
			expect(apiRequest).toHaveBeenCalledTimes(2);
		});
	},
);
