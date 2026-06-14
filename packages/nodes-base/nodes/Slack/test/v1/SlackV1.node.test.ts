import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as GenericFunctions from '../../V1/GenericFunctions';
import { SlackV1 } from '../../V1/SlackV1.node';

describe('SlackV1 — multiOptions parameter normalization', () => {
	let node: SlackV1;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let slackApiRequestSpy: jest.SpyInstance;
	let slackApiRequestAllItemsSpy: jest.SpyInstance;

	const mockNode: INode = {
		id: 'test-node-id',
		name: 'Slack Test',
		type: 'n8n-nodes-base.slack',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	beforeEach(() => {
		node = new SlackV1({
			name: 'Slack',
			displayName: 'Slack',
			description: 'Slack V1 node test',
			group: ['input'],
		});

		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		slackApiRequestSpy = jest.spyOn(GenericFunctions, 'slackApiRequest');
		slackApiRequestAllItemsSpy = jest.spyOn(GenericFunctions, 'slackApiRequestAllItems');

		jest.clearAllMocks();

		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		(mockExecuteFunctions.helpers.constructExecutionMetaData as jest.Mock).mockImplementation(
			(data: any, options: any) => {
				return data.map((item: any, index: number) => ({
					...item,
					pairedItem: { item: options?.itemData?.item ?? index },
				}));
			},
		);
		(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation((data: any) => {
			return [{ json: data }];
		});
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	const mockParams = (params: Record<string, any>) => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			return params[paramName];
		});
	};

	describe('channel: getAll — filters.types', () => {
		it('joins an array of types', async () => {
			mockParams({
				authentication: 'accessToken',
				resource: 'channel',
				operation: 'getAll',
				returnAll: false,
				limit: 10,
				filters: { types: ['public_channel', 'private_channel'] },
			});
			slackApiRequestSpy.mockResolvedValue({ channels: [] });

			await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/conversations.list',
				{},
				expect.objectContaining({ types: 'public_channel,private_channel' }),
			);
		});

		it('normalizes a comma-joined string with trailing whitespace', async () => {
			mockParams({
				authentication: 'accessToken',
				resource: 'channel',
				operation: 'getAll',
				returnAll: false,
				limit: 10,
				filters: { types: 'public_channel,private_channel ' },
			});
			slackApiRequestSpy.mockResolvedValue({ channels: [] });

			await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/conversations.list',
				{},
				expect.objectContaining({ types: 'public_channel,private_channel' }),
			);
		});
	});

	describe('channel: invite — userIds', () => {
		it('joins an array of user IDs', async () => {
			mockParams({
				authentication: 'accessToken',
				resource: 'channel',
				operation: 'invite',
				channelId: 'C123456789',
				userIds: ['U111111111', 'U222222222'],
			});
			slackApiRequestSpy.mockResolvedValue({ channel: { id: 'C123456789' } });

			await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/conversations.invite',
				{ channel: 'C123456789', users: 'U111111111,U222222222' },
				{},
			);
		});

		it('normalizes a comma-joined string with trailing whitespace (whitespace-coerced expression)', async () => {
			mockParams({
				authentication: 'accessToken',
				resource: 'channel',
				operation: 'invite',
				channelId: 'C123456789',
				userIds: 'U111111111,U222222222 ',
			});
			slackApiRequestSpy.mockResolvedValue({ channel: { id: 'C123456789' } });

			await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/conversations.invite',
				{ channel: 'C123456789', users: 'U111111111,U222222222' },
				{},
			);
		});
	});

	describe('channel: open — options.users', () => {
		it('joins an array of users', async () => {
			mockParams({
				authentication: 'accessToken',
				resource: 'channel',
				operation: 'open',
				options: { users: ['U111111111', 'U222222222'], returnIm: true },
			});
			slackApiRequestSpy.mockResolvedValue({ channel: { id: 'D1' } });

			await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/conversations.open',
				{ users: 'U111111111,U222222222', return_im: true },
				{},
			);
		});

		it('normalizes a comma-joined string for users option', async () => {
			mockParams({
				authentication: 'accessToken',
				resource: 'channel',
				operation: 'open',
				options: { users: 'U111111111,U222222222 ' },
			});
			slackApiRequestSpy.mockResolvedValue({ channel: { id: 'D1' } });

			await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/conversations.open',
				{ users: 'U111111111,U222222222' },
				{},
			);
		});
	});

	describe('file: upload — options.channelIds', () => {
		it('joins an array of channel IDs', async () => {
			mockParams({
				authentication: 'accessToken',
				resource: 'file',
				operation: 'upload',
				binaryData: false,
				fileContent: 'hello',
				options: { channelIds: ['C111111111', 'C222222222'] },
			});
			slackApiRequestSpy.mockResolvedValue({ file: { id: 'F1' } });

			await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/files.upload',
				expect.objectContaining({ channels: 'C111111111,C222222222' }),
				{},
				{ 'Content-Type': 'application/x-www-form-urlencoded' },
				expect.objectContaining({
					form: expect.objectContaining({ channels: 'C111111111,C222222222' }),
				}),
			);
		});

		it('normalizes a comma-joined string for channelIds option', async () => {
			mockParams({
				authentication: 'accessToken',
				resource: 'file',
				operation: 'upload',
				binaryData: false,
				fileContent: 'hello',
				options: { channelIds: 'C111111111,C222222222 ' },
			});
			slackApiRequestSpy.mockResolvedValue({ file: { id: 'F1' } });

			await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/files.upload',
				expect.objectContaining({ channels: 'C111111111,C222222222' }),
				{},
				{ 'Content-Type': 'application/x-www-form-urlencoded' },
				expect.anything(),
			);
		});
	});

	describe('file: getAll — filters.types', () => {
		it('joins an array of file types', async () => {
			mockParams({
				authentication: 'accessToken',
				resource: 'file',
				operation: 'getAll',
				returnAll: true,
				filters: { types: ['images', 'pdfs'] },
			});
			slackApiRequestAllItemsSpy.mockResolvedValue([]);

			await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'files',
				'GET',
				'/files.list',
				{},
				expect.objectContaining({ types: 'images,pdfs' }),
			);
		});

		it('normalizes a comma-joined string for file types', async () => {
			mockParams({
				authentication: 'accessToken',
				resource: 'file',
				operation: 'getAll',
				returnAll: true,
				filters: { types: 'images,pdfs ' },
			});
			slackApiRequestAllItemsSpy.mockResolvedValue([]);

			await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'files',
				'GET',
				'/files.list',
				{},
				expect.objectContaining({ types: 'images,pdfs' }),
			);
		});
	});
});
