import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
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

const teamId = '1111-2222-3333';
const channelId = '19:abc@thread.tacv2';
const messageId = '1698378560692';
const parentMessageId = '1698324478896';
const messagesPath = `/v1.0/teams/${teamId}/channels/${channelId}/messages`;
const successOutput = [[{ json: { success: true }, pairedItem: { item: 0 } }]];

describe.each<[string, string]>([['softDeleteMessage', 'softDelete']])(
	'Microsoft Teams V2 — channelMessage:%s',
	(operation, action) => {
		const rootPath = `${messagesPath}/${messageId}/${action}`;
		const apiRequest = vi.mocked(transport.microsoftApiRequest);
		let node: MicrosoftTeamsV2;
		let ctx: MockProxy<IExecuteFunctions>;

		beforeEach(() => {
			node = new MicrosoftTeamsV2(versionDescription);
			ctx = createExecuteContext();
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		const run = async (params: Record<string, unknown> = {}) => {
			setParams(ctx, {
				authentication: 'microsoftTeamsOAuth2Api',
				resource: 'channelMessage',
				operation,
				teamId,
				channelId,
				messageId,
				...params,
			});
			return await node.execute.call(ctx);
		};

		it('posts the action path of a root message', async () => {
			apiRequest.mockResolvedValueOnce(undefined);

			const result = await run();

			expect(apiRequest).toHaveBeenCalledTimes(1);
			expect(apiRequest).toHaveBeenCalledWith('POST', rootPath);
			expect(result).toEqual(successOutput);
		});

		it('accepts a numeric message ID from an expression', async () => {
			apiRequest.mockResolvedValueOnce(undefined);

			await run({ messageId: 1698324478896 });

			expect(apiRequest).toHaveBeenCalledTimes(1);
			expect(apiRequest).toHaveBeenCalledWith('POST', `${messagesPath}/1698324478896/${action}`);
		});

		it('posts the action path of a reply when a parent message ID is set', async () => {
			apiRequest.mockResolvedValueOnce(undefined);

			const result = await run({ options: { parentMessageId } });

			expect(apiRequest).toHaveBeenCalledTimes(1);
			expect(apiRequest).toHaveBeenCalledWith(
				'POST',
				`${messagesPath}/${parentMessageId}/replies/${messageId}/${action}`,
			);
			expect(result).toEqual(successOutput);
		});

		it('posts the action path of a root message when the parent message ID is blank', async () => {
			apiRequest.mockResolvedValueOnce(undefined);

			await run({ options: { parentMessageId: '  ' } });

			expect(apiRequest).toHaveBeenCalledTimes(1);
			expect(apiRequest).toHaveBeenCalledWith('POST', rootPath);
		});

		it.each([
			['team', { teamId: 'a/b' }],
			['message', { messageId: 'a/b' }],
			['parent message', { options: { parentMessageId: 'a/b' } }],
		])('rejects a malformed %s ID before any request', async (_label, params) => {
			await expect(run(params)).rejects.toThrow('The ID is not valid');
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it('rejects an empty message ID before any request', async () => {
			await expect(run({ messageId: '' })).rejects.toThrow('A required ID is empty');
			expect(apiRequest).not.toHaveBeenCalled();
		});

		it('maps a 403 to an operation error that names the missing scope', async () => {
			const graphMessage = 'Missing scope permissions on the request.';
			const error = new NodeApiError(
				ctx.getNode(),
				{ message: graphMessage },
				{ httpCode: '403', message: graphMessage },
			);
			apiRequest.mockRejectedValueOnce(error);

			const thrown: unknown = await run().catch((cause: unknown) => cause);

			expect(thrown).toBeInstanceOf(NodeOperationError);
			expect(thrown).toMatchObject({ message: graphMessage });
			expect(thrown).toHaveProperty(
				'description',
				expect.stringContaining('ChannelMessage.ReadWrite'),
			);
			expect(apiRequest).toHaveBeenCalledTimes(1);
		});

		it('propagates a Graph error from the action request unchanged', async () => {
			const error = new NodeApiError(ctx.getNode(), { message: 'Not Found' }, { httpCode: '404' });
			apiRequest.mockRejectedValueOnce(error);

			await expect(run()).rejects.toBe(error);
			expect(apiRequest).toHaveBeenCalledTimes(1);
		});
	},
);
