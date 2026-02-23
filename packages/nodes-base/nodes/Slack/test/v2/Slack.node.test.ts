import { mockDeep } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeParameterResourceLocator,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { SlackV2 } from '../../V2/SlackV2.node';
import * as GenericFunctions from '../../V2/GenericFunctions';

describe('SlackV2', () => {
	let node: SlackV2;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let slackApiRequestSpy: jest.SpyInstance;
	let slackApiRequestAllItemsSpy: jest.SpyInstance;

	const mockNode: INode = {
		id: 'test-node-id',
		name: 'Slack Test',
		type: 'n8n-nodes-base.slack',
		typeVersion: 2,
		position: [0, 0],
		parameters: {},
	};

	beforeEach(() => {
		node = new SlackV2({
			name: 'Slack',
			displayName: 'Slack',
			description: 'Slack node test',
			group: ['input'],
		});

		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		slackApiRequestSpy = jest.spyOn(GenericFunctions, 'slackApiRequest');
		slackApiRequestAllItemsSpy = jest.spyOn(GenericFunctions, 'slackApiRequestAllItems');

		jest.clearAllMocks();

		// Default mocks
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			const mockParams: Record<string, any> = {
				authentication: 'accessToken',
				resource: 'channel',
				operation: 'kick',
			};
			return mockParams[paramName];
		});
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		// Mock helper functions
		(mockExecuteFunctions.helpers.constructExecutionMetaData as jest.Mock).mockImplementation(
			(data: any, options: any) => {
				return data.map((item: any, index: number) => ({
					...item,
					pairedItem: { item: options?.itemData?.item ?? index },
				}));
			},
		);
		(mockExecuteFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation((data: any) => {
			// returnJsonArray should always return array with single item containing the data
			return [{ json: data }];
		});
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('Channel Operations - Kick and Join', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					authentication: 'accessToken',
					resource: 'channel',
					operation: 'kick',
					channelId: 'C123456789',
					userId: 'U987654321',
				};
				return params[paramName];
			});
		});

		it('should kick user from channel successfully', async () => {
			slackApiRequestSpy.mockResolvedValue({ ok: true });

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/conversations.kick',
				{
					channel: 'C123456789',
					user: 'U987654321',
				},
				{},
			);
			expect(result).toEqual([[{ json: { ok: true }, pairedItem: { item: 0 } }]]);
		});

		it('should join channel successfully', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					authentication: 'accessToken',
					resource: 'channel',
					operation: 'join',
					channelId: 'C123456789',
				};
				return params[paramName];
			});

			const mockResponse = {
				channel: {
					id: 'C123456789',
					name: 'general',
					is_channel: true,
				},
			};
			slackApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/conversations.join',
				{
					channel: 'C123456789',
				},
				{},
			);
			expect(result).toEqual([
				[
					{
						json: mockResponse.channel,
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should handle API error when kicking user', async () => {
			slackApiRequestSpy.mockRejectedValue(new Error('Channel not found'));
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[{ json: { error: 'Channel not found' } }]]);
		});
	});

	describe('Channel Operations - History, Invite, Leave, Members, etc.', () => {
		it('should get channel history with pagination', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'channel',
					operation: 'history',
					channelId: 'C123456789',
					returnAll: false,
					limit: 50,
					filters: {},
				};
				return params[paramName];
			});

			const mockResponse = {
				messages: [
					{ type: 'message', text: 'Hello', ts: '1234567890.123456' },
					{ type: 'message', text: 'World', ts: '1234567891.123456' },
				],
			};
			slackApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/conversations.history',
				{},
				{
					channel: 'C123456789',
					limit: 50,
				},
			);
			expect(result).toEqual([
				[
					{
						json: mockResponse.messages,
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should return channel history sorted by timestamp descending for node version >= 2.4', async () => {
			mockExecuteFunctions.getNode.mockReturnValue({
				...mockNode,
				typeVersion: 2.4,
			});

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'channel',
					operation: 'history',
					channelId: 'C123456789',
					returnAll: true,
					filters: {},
				};
				return params[paramName];
			});

			// Mock unsorted messages
			const mockResponse = [
				{ type: 'message', text: 'Message 2', ts: '1234567892.123456' },
				{ type: 'message', text: 'Message 4', ts: '1234567894.123456' },
				{ type: 'message', text: 'Message 1', ts: '1234567891.123456' },
				{ type: 'message', text: 'Message 3', ts: '1234567893.123456' },
			];
			slackApiRequestAllItemsSpy.mockResolvedValue(mockResponse);

			const result = await node.execute.call(mockExecuteFunctions);

			// Verify messages are sorted by timestamp descending (newest first)
			expect(result[0][0].json).toEqual([
				{ type: 'message', text: 'Message 4', ts: '1234567894.123456' },
				{ type: 'message', text: 'Message 3', ts: '1234567893.123456' },
				{ type: 'message', text: 'Message 2', ts: '1234567892.123456' },
				{ type: 'message', text: 'Message 1', ts: '1234567891.123456' },
			]);
		});

		it('should get all channel history', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'channel',
					operation: 'history',
					channelId: 'C123456789',
					returnAll: true,
					filters: {
						latest: '2023-12-01',
						oldest: '2023-11-01',
						inclusive: true,
					},
				};
				return params[paramName];
			});

			const mockMessages = [
				{ type: 'message', text: 'Message 1', ts: '1234567890.123456' },
				{ type: 'message', text: 'Message 2', ts: '1234567891.123456' },
			];
			slackApiRequestAllItemsSpy.mockResolvedValue(mockMessages);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'messages',
				'GET',
				'/conversations.history',
				{},
				{
					channel: 'C123456789',
					inclusive: true,
					latest: new Date('2023-12-01').getTime() / 1000,
					oldest: new Date('2023-11-01').getTime() / 1000,
				},
			);
			expect(result).toEqual([
				[
					{
						json: mockMessages,
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should invite users to channel', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'channel',
					operation: 'invite',
					channelId: 'C123456789',
					userIds: ['U111111111', 'U222222222'],
				};
				return params[paramName];
			});

			const mockResponse = {
				channel: {
					id: 'C123456789',
					name: 'general',
					members: ['U111111111', 'U222222222'],
				},
			};
			slackApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/conversations.invite',
				{
					channel: 'C123456789',
					users: 'U111111111,U222222222',
				},
				{},
			);
			expect(result).toEqual([
				[
					{
						json: mockResponse.channel,
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should leave channel', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'channel',
					operation: 'leave',
					channelId: 'C123456789',
				};
				return params[paramName];
			});

			slackApiRequestSpy.mockResolvedValue({ ok: true });

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/conversations.leave',
				{
					channel: 'C123456789',
				},
				{},
			);
			expect(result).toEqual([[{ json: { ok: true }, pairedItem: { item: 0 } }]]);
		});

		it('should get channel members with resolve data', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'channel',
					operation: 'member',
					channelId: 'C123456789',
					returnAll: true,
					resolveData: true,
				};
				return params[paramName];
			});

			const mockMembers = ['U111111111', 'U222222222'];
			slackApiRequestAllItemsSpy.mockResolvedValue(mockMembers);

			// Mock user info responses
			slackApiRequestSpy
				.mockResolvedValueOnce({
					user: {
						id: 'U111111111',
						name: 'john.doe',
						real_name: 'John Doe',
					},
				})
				.mockResolvedValueOnce({
					user: {
						id: 'U222222222',
						name: 'jane.smith',
						real_name: 'Jane Smith',
					},
				});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'members',
				'GET',
				'/conversations.members',
				{},
				{
					channel: 'C123456789',
				},
			);
			expect(slackApiRequestSpy).toHaveBeenCalledTimes(2);
			expect(result[0][0].json).toEqual([
				{
					id: 'U111111111',
					name: 'john.doe',
					real_name: 'John Doe',
				},
				{
					id: 'U222222222',
					name: 'jane.smith',
					real_name: 'Jane Smith',
				},
			]);
		});

		it('should open conversation', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'channel',
					operation: 'open',
					options: {
						users: ['U111111111', 'U222222222'],
						returnIm: true,
					},
				};
				return params[paramName];
			});

			const mockResponse = {
				channel: {
					id: 'D123456789',
					created: 1234567890,
				},
			};
			slackApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/conversations.open',
				{
					users: 'U111111111,U222222222',
					return_im: true,
				},
				{},
			);
			expect(result).toEqual([
				[
					{
						json: mockResponse.channel,
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should rename channel', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'channel',
					operation: 'rename',
					channelId: 'C123456789',
					name: 'new-channel-name',
				};
				return params[paramName];
			});

			const mockResponse = {
				channel: {
					id: 'C123456789',
					name: 'new-channel-name',
				},
			};
			slackApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/conversations.rename',
				{
					channel: 'C123456789',
					name: 'new-channel-name',
				},
				{},
			);
			expect(result).toEqual([
				[
					{
						json: mockResponse.channel,
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should get conversation replies', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'channel',
					operation: 'replies',
					channelId: 'C123456789',
					ts: '1234567890.123456',
					returnAll: false,
					limit: 100,
					filters: {
						inclusive: true,
					},
				};
				return params[paramName];
			});

			const mockResponse = {
				messages: [
					{ type: 'message', text: 'Original message', ts: '1234567890.123456' },
					{
						type: 'message',
						text: 'Reply 1',
						ts: '1234567891.123456',
						thread_ts: '1234567890.123456',
					},
				],
			};
			slackApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/conversations.replies',
				{},
				{
					channel: 'C123456789',
					ts: '1234567890.123456',
					limit: 100,
					inclusive: true,
				},
			);
			expect(result).toEqual([
				[
					{
						json: mockResponse.messages,
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should set channel purpose', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'channel',
					operation: 'setPurpose',
					channelId: 'C123456789',
					purpose: 'New channel purpose',
				};
				return params[paramName];
			});

			const mockResponse = {
				channel: {
					id: 'C123456789',
					purpose: {
						value: 'New channel purpose',
						creator: 'U123456789',
						last_set: 1234567890,
					},
				},
			};
			slackApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/conversations.setPurpose',
				{
					channel: 'C123456789',
					purpose: 'New channel purpose',
				},
				{},
			);
			expect(result).toEqual([
				[
					{
						json: mockResponse.channel,
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should set channel topic', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'channel',
					operation: 'setTopic',
					channelId: 'C123456789',
					topic: 'New channel topic',
				};
				return params[paramName];
			});

			const mockResponse = {
				channel: {
					id: 'C123456789',
					topic: {
						value: 'New channel topic',
						creator: 'U123456789',
						last_set: 1234567890,
					},
				},
			};
			slackApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/conversations.setTopic',
				{
					channel: 'C123456789',
					topic: 'New channel topic',
				},
				{},
			);
			expect(result).toEqual([
				[
					{
						json: mockResponse.channel,
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should unarchive channel', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'channel',
					operation: 'unarchive',
					channelId: 'C123456789',
				};
				return params[paramName];
			});

			slackApiRequestSpy.mockResolvedValue({ ok: true });

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/conversations.unarchive',
				{
					channel: 'C123456789',
				},
				{},
			);
			expect(result).toEqual([[{ json: { ok: true }, pairedItem: { item: 0 } }]]);
		});
	});

	describe('Message Operations - Ephemeral Messages', () => {
		beforeEach(() => {
			jest.spyOn(GenericFunctions, 'getTarget').mockReturnValue('C123456789');
			jest.spyOn(GenericFunctions, 'getMessageContent').mockReturnValue({
				text: 'Test ephemeral message',
			});
			jest.spyOn(GenericFunctions, 'processThreadOptions').mockReturnValue({});
		});

		it('should send ephemeral message to channel', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'message',
					operation: 'post',
					select: 'channel',
					otherOptions: {
						ephemeral: {
							ephemeralValues: {
								user: {
									mode: 'id',
									value: 'U123456789',
								} as INodeParameterResourceLocator,
							},
						},
					},
				};
				return params[paramName];
			});

			const mockResponse = {
				ok: true,
				message: {
					type: 'message',
					text: 'Test ephemeral message',
					user: 'U123456789',
				},
			};
			slackApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/chat.postEphemeral',
				expect.objectContaining({
					channel: 'C123456789',
					text: 'Test ephemeral message',
					user: 'U123456789',
				}),
				{},
			);
			expect(result).toEqual([
				[
					{
						json: mockResponse,
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should send ephemeral message to user with username format', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'message',
					operation: 'post',
					select: 'channel',
					otherOptions: {
						ephemeral: {
							ephemeralValues: {
								user: {
									mode: 'username',
									value: 'john.doe',
								} as INodeParameterResourceLocator,
							},
						},
					},
				};
				return params[paramName];
			});

			const mockResponse = { ok: true };
			slackApiRequestSpy.mockResolvedValue(mockResponse);

			await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/chat.postEphemeral',
				expect.objectContaining({
					user: '@john.doe',
				}),
				{},
			);
		});

		it('should send ephemeral message to user directly', async () => {
			jest.spyOn(GenericFunctions, 'getTarget').mockReturnValue('U123456789');
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'message',
					operation: 'post',
					select: 'user',
					otherOptions: {
						ephemeral: {},
					},
				};
				return params[paramName];
			});

			const mockResponse = { ok: true };
			slackApiRequestSpy.mockResolvedValue(mockResponse);

			await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/chat.postEphemeral',
				expect.objectContaining({
					channel: 'U123456789',
					user: 'U123456789',
				}),
				{},
			);
		});
	});

	describe('Reaction and Star Operations', () => {
		describe('Reaction Operations', () => {
			it('should add reaction to message', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						resource: 'reaction',
						operation: 'add',
						channelId: 'C123456789',
						timestamp: '1234567890.123456',
						name: 'thumbs_up',
					};
					return params[paramName];
				});

				slackApiRequestSpy.mockResolvedValue({ ok: true });

				const result = await node.execute.call(mockExecuteFunctions);

				expect(slackApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/reactions.add',
					{
						channel: 'C123456789',
						name: 'thumbs_up',
						timestamp: '1234567890.123456',
					},
					{},
				);
				expect(result).toEqual([[{ json: { ok: true }, pairedItem: { item: 0 } }]]);
			});

			it('should remove reaction from message', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						resource: 'reaction',
						operation: 'remove',
						channelId: 'C123456789',
						timestamp: '1234567890.123456',
						name: 'thumbs_up',
					};
					return params[paramName];
				});

				slackApiRequestSpy.mockResolvedValue({ ok: true });

				const result = await node.execute.call(mockExecuteFunctions);

				expect(slackApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/reactions.remove',
					{
						channel: 'C123456789',
						name: 'thumbs_up',
						timestamp: '1234567890.123456',
					},
					{},
				);
				expect(result).toEqual([[{ json: { ok: true }, pairedItem: { item: 0 } }]]);
			});

			it('should get reactions for message', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						resource: 'reaction',
						operation: 'get',
						channelId: 'C123456789',
						timestamp: '1234567890.123456',
					};
					return params[paramName];
				});

				const mockResponse = {
					message: {
						reactions: [
							{
								name: 'thumbs_up',
								count: 2,
								users: ['U111111111', 'U222222222'],
							},
						],
					},
				};
				slackApiRequestSpy.mockResolvedValue(mockResponse);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(slackApiRequestSpy).toHaveBeenCalledWith(
					'GET',
					'/reactions.get',
					{},
					{
						channel: 'C123456789',
						timestamp: '1234567890.123456',
					},
				);
				expect(result).toEqual([
					[
						{
							json: mockResponse,
							pairedItem: { item: 0 },
						},
					],
				]);
			});
		});

		describe('Star Operations', () => {
			it('should add star to message', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						resource: 'star',
						operation: 'add',
						target: 'message',
						channelId: 'C123456789',
						timestamp: '1234567890.123456',
						options: {},
					};
					return params[paramName];
				});

				slackApiRequestSpy.mockResolvedValue({ ok: true });

				const result = await node.execute.call(mockExecuteFunctions);

				expect(slackApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/stars.add',
					{
						channel: 'C123456789',
						timestamp: '1234567890.123456',
					},
					{},
				);
				expect(result).toEqual([[{ json: { ok: true }, pairedItem: { item: 0 } }]]);
			});

			it('should add star to file', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						resource: 'star',
						operation: 'add',
						target: 'file',
						channelId: 'C123456789',
						fileId: 'F123456789',
						options: {
							fileComment: 'FC123456789',
						},
					};
					return params[paramName];
				});

				slackApiRequestSpy.mockResolvedValue({ ok: true });

				await node.execute.call(mockExecuteFunctions);

				expect(slackApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/stars.add',
					{
						channel: 'C123456789',
						file: 'F123456789',
						file_comment: 'FC123456789',
					},
					{},
				);
			});

			it('should remove star', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						resource: 'star',
						operation: 'delete',
						options: {
							channelId: 'C123456789',
							timestamp: '1234567890.123456',
							fileId: 'F123456789',
							fileComment: 'FC123456789',
						},
					};
					return params[paramName];
				});

				slackApiRequestSpy.mockResolvedValue({ ok: true });

				await node.execute.call(mockExecuteFunctions);

				expect(slackApiRequestSpy).toHaveBeenCalledWith(
					'POST',
					'/stars.remove',
					{
						channel: 'C123456789',
						file: 'F123456789',
						file_comment: 'FC123456789',
						timestamp: '1234567890.123456',
					},
					{},
				);
			});

			it('should get all stars', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						resource: 'star',
						operation: 'getAll',
						returnAll: true,
					};
					return params[paramName];
				});

				const mockStars = [
					{
						type: 'message',
						message: {
							text: 'Starred message',
							ts: '1234567890.123456',
						},
					},
				];
				slackApiRequestAllItemsSpy.mockResolvedValue(mockStars);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(slackApiRequestAllItemsSpy).toHaveBeenCalledWith(
					'items',
					'GET',
					'/stars.list',
					{},
					{},
				);
				expect(result).toEqual([
					[
						{
							json: mockStars,
							pairedItem: { item: 0 },
						},
					],
				]);
			});

			it('should get stars with limit', async () => {
				mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
					const params: Record<string, any> = {
						resource: 'star',
						operation: 'getAll',
						returnAll: false,
						limit: 10,
					};
					return params[paramName];
				});

				const mockResponse = {
					items: [
						{
							type: 'message',
							message: {
								text: 'Starred message',
								ts: '1234567890.123456',
							},
						},
					],
				};
				slackApiRequestSpy.mockResolvedValue(mockResponse);

				const result = await node.execute.call(mockExecuteFunctions);

				expect(slackApiRequestSpy).toHaveBeenCalledWith(
					'GET',
					'/stars.list',
					{},
					{
						limit: 10,
					},
				);
				expect(result).toEqual([
					[
						{
							json: mockResponse.items,
							pairedItem: { item: 0 },
						},
					],
				]);
			});
		});
	});

	describe('File Upload Operations - Setup', () => {
		it('should set up file upload options correctly', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'file',
					operation: 'upload',
					options: {
						channelIds: ['C111111111', 'C222222222'],
						channelId: 'C123456789',
						initialComment: 'File upload test',
						threadTs: '1234567890.123456',
					},
				};
				return params[paramName];
			});

			// We'll test the parameter extraction logic
			expect(mockExecuteFunctions.getNodeParameter('options', 0)).toEqual({
				channelIds: ['C111111111', 'C222222222'],
				channelId: 'C123456789',
				initialComment: 'File upload test',
				threadTs: '1234567890.123456',
			});
		});
	});

	describe('File Upload Operations - Binary Data Handling', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'file',
					operation: 'upload',
					binaryData: true,
					binaryPropertyName: 'data',
					options: {
						title: 'Test File',
						channelIds: ['C123456789'],
						initialComment: 'Test upload',
					},
				};
				return params[paramName];
			});
		});

		it('should upload file with binary data (node version <= 2.1)', async () => {
			mockExecuteFunctions.getNode.mockReturnValue({
				...mockNode,
				typeVersion: 2.1,
			});

			const mockBinaryData = {
				data: 'base64encodeddata', // cspell:disable-line
				fileName: 'test.txt',
				mimeType: 'text/plain',
			};

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);

			const mockResponse = {
				file: {
					id: 'F123456789',
					name: 'test.txt',
					mimetype: 'text/plain',
				},
			};
			slackApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/files.upload',
				{},
				{},
				{ 'Content-Type': 'multipart/form-data' },
				{
					formData: expect.objectContaining({
						channels: 'C123456789',
						initial_comment: 'Test upload',
						title: 'Test File',
						file: expect.objectContaining({
							value: expect.any(Buffer),
							options: {
								filename: 'test.txt',
								contentType: 'text/plain',
							},
						}),
					}),
				},
			);
			expect(result).toEqual([
				[
					{
						json: mockResponse.file,
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should upload file with external upload (node version > 2.1)', async () => {
			mockExecuteFunctions.getNode.mockReturnValue({
				...mockNode,
				typeVersion: 2.2,
			});

			const mockBinaryData = {
				id: 'binary-data-id',
				fileName: 'test.txt',
				mimeType: 'text/plain',
			};

			const mockStream = Buffer.from('file content');
			const mockMetadata = { fileSize: 12 };

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);
			(mockExecuteFunctions.helpers.getBinaryStream as jest.Mock).mockResolvedValue(mockStream);
			(mockExecuteFunctions.helpers.getBinaryMetadata as jest.Mock).mockResolvedValue(mockMetadata);

			// Mock the upload URL response
			const mockUploadUrlResponse = {
				upload_url: 'https://files.slack.com/upload/v1',
				file_id: 'F123456789',
			};
			slackApiRequestSpy
				.mockResolvedValueOnce(mockUploadUrlResponse) // getUploadURLExternal
				.mockResolvedValueOnce({ ok: true }) // upload to external URL
				.mockResolvedValueOnce({
					// completeUploadExternal
					files: [
						{
							id: 'F123456789',
							title: 'Test File',
						},
					],
				});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledTimes(3);

			// Check getUploadURLExternal call
			expect(slackApiRequestSpy).toHaveBeenNthCalledWith(
				1,
				'GET',
				'/files.getUploadURLExternal',
				{},
				{
					filename: 'test.txt',
					length: 12,
				},
			);

			// Check external upload call
			expect(slackApiRequestSpy).toHaveBeenNthCalledWith(
				2,
				'POST',
				'https://files.slack.com/upload/v1',
				{},
				{},
				{ 'Content-Type': 'multipart/form-data' },
				{
					formData: expect.objectContaining({
						file: expect.objectContaining({
							value: mockStream,
						}),
					}),
				},
			);

			// Check completeUploadExternal call
			expect(slackApiRequestSpy).toHaveBeenNthCalledWith(
				3,
				'POST',
				'/files.completeUploadExternal',
				{
					channels: 'C123456789',
					initial_comment: 'Test upload',
					files: [
						{
							id: 'F123456789',
							title: 'Test File',
						},
					],
				},
			);

			expect(result).toEqual([
				[
					{
						json: [
							{
								id: 'F123456789',
								title: 'Test File',
							},
						],
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should upload file content as text', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'file',
					operation: 'upload',
					binaryData: false,
					fileContent: 'This is text file content',
					options: {
						channelIds: ['C123456789'],
					},
				};
				return params[paramName];
			});

			const mockResponse = {
				file: {
					id: 'F123456789',
					name: 'content.txt',
				},
			};
			slackApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenCalledWith(
				'POST',
				'/files.upload',
				{
					channels: 'C123456789',
					content: 'This is text file content',
				},
				{},
				{ 'Content-Type': 'application/x-www-form-urlencoded' },
				{
					form: expect.objectContaining({
						channels: 'C123456789',
						content: 'This is text file content',
					}),
				},
			);
			expect(result).toEqual([
				[
					{
						json: mockResponse.file,
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should handle binary data without id (legacy format)', async () => {
			mockExecuteFunctions.getNode.mockReturnValue({
				...mockNode,
				typeVersion: 2.2,
			});

			const mockBinaryData = {
				data: 'YmFzZTY0ZGF0YQ==', // base64 encoded data
				fileName: 'test.txt',
				mimeType: 'text/plain',
			};

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);

			const mockUploadUrlResponse = {
				upload_url: 'https://files.slack.com/upload/v1',
				file_id: 'F123456789',
			};

			slackApiRequestSpy
				.mockResolvedValueOnce(mockUploadUrlResponse)
				.mockResolvedValueOnce({ ok: true })
				.mockResolvedValueOnce({
					files: [{ id: 'F123456789', title: 'test.txt' }],
				});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenNthCalledWith(
				1,
				'GET',
				'/files.getUploadURLExternal',
				{},
				{
					filename: 'test.txt',
					length: 10, // length of decoded 'base64data'
				},
			);

			expect(result).toEqual([
				[
					{
						json: [{ id: 'F123456789', title: 'test.txt' }],
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should use custom filename when provided', async () => {
			mockExecuteFunctions.getNode.mockReturnValue({
				...mockNode,
				typeVersion: 2.2,
			});

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'file',
					operation: 'upload',
					binaryData: true,
					binaryPropertyName: 'data',
					options: {
						fileName: 'custom-name.txt',
						title: 'Custom Title',
					},
				};
				return params[paramName];
			});

			const mockBinaryData = {
				id: 'binary-data-id',
				fileName: 'original.txt',
				mimeType: 'text/plain',
			};

			(mockExecuteFunctions.helpers.assertBinaryData as jest.Mock).mockReturnValue(mockBinaryData);
			(mockExecuteFunctions.helpers.getBinaryStream as jest.Mock).mockResolvedValue(
				Buffer.from('test'),
			);
			(mockExecuteFunctions.helpers.getBinaryMetadata as jest.Mock).mockResolvedValue({
				fileSize: 4,
			});

			slackApiRequestSpy
				.mockResolvedValueOnce({ upload_url: 'https://test.com', file_id: 'F123' })
				.mockResolvedValueOnce({ ok: true })
				.mockResolvedValueOnce({ files: [{ id: 'F123', title: 'Custom Title' }] });

			await node.execute.call(mockExecuteFunctions);

			expect(slackApiRequestSpy).toHaveBeenNthCalledWith(
				1,
				'GET',
				'/files.getUploadURLExternal',
				{},
				{
					filename: 'custom-name.txt',
					length: 4,
				},
			);
		});
	});

	describe('Error Handling with continueOnFail', () => {
		it('should continue execution on API error when continueOnFail is true', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'channel',
					operation: 'kick',
					channelId: 'C123456789',
					userId: 'U987654321',
				};
				return params[paramName];
			});

			mockExecuteFunctions.continueOnFail.mockReturnValue(true);
			slackApiRequestSpy.mockRejectedValue(new Error('Channel not found'));

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([
				[
					{
						json: { error: 'Channel not found' },
					},
				],
			]);
		});

		it('should throw error when continueOnFail is false', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'channel',
					operation: 'kick',
					channelId: 'C123456789',
					userId: 'U987654321',
				};
				return params[paramName];
			});

			mockExecuteFunctions.continueOnFail.mockReturnValue(false);
			const apiError = new NodeOperationError(mockNode, 'API Error');
			slackApiRequestSpy.mockRejectedValue(apiError);

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(apiError);
		});

		it('should handle multiple items with mixed success and failure', async () => {
			const inputData: INodeExecutionData[] = [
				{ json: { id: 1 } },
				{ json: { id: 2 } },
				{ json: { id: 3 } },
			];

			mockExecuteFunctions.getInputData.mockReturnValue(inputData);
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				return {
					resource: 'channel',
					operation: 'kick',
					channelId: 'C123456789',
					userId: 'U987654321',
				}[paramName];
			});

			// First call succeeds, second fails, third succeeds
			slackApiRequestSpy
				.mockResolvedValueOnce({ ok: true })
				.mockRejectedValueOnce(new Error('User not found'))
				.mockResolvedValueOnce({ ok: true });

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([
				[
					{ json: { ok: true }, pairedItem: { item: 0 } },
					{ json: { error: 'User not found' } },
					{ json: { ok: true }, pairedItem: { item: 2 } },
				],
			]);
		});

		it('should handle JSON errors correctly', async () => {
			mockExecuteFunctions.continueOnFail.mockReturnValue(true);

			const jsonError = {
				message: 'Invalid JSON response',
				code: 'INVALID_JSON',
			};

			slackApiRequestSpy.mockRejectedValue(jsonError);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([
				[
					{
						json: { error: 'Invalid JSON response' },
					},
				],
			]);
		});
	});

	describe('Edge Cases and Error Scenarios', () => {
		it('should handle empty input data', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([]);

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[]]);
		});

		it('should handle unknown resource/operation combination', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, any> = {
					resource: 'unknown',
					operation: 'unknown',
				};
				return params[paramName];
			});

			const result = await node.execute.call(mockExecuteFunctions);

			expect(result).toEqual([
				[
					{
						json: {
							error: 'Resource unknown / operation unknown not found!',
						},
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should throw error for ephemeral message with username when select is user', async () => {
			jest.spyOn(GenericFunctions, 'getTarget').mockReturnValue('U123456789');
			jest.spyOn(GenericFunctions, 'getMessageContent').mockReturnValue({
				text: 'Test message',
			});
			jest.spyOn(GenericFunctions, 'processThreadOptions').mockReturnValue({});

			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'resource') return 'message';
				if (paramName === 'operation') return 'post';
				if (paramName === 'select') return 'user';
				if (paramName === 'user') {
					return {
						mode: 'username',
						value: 'john.doe',
					} as INodeParameterResourceLocator;
				}
				if (paramName === 'otherOptions') {
					return {
						ephemeral: {},
					};
				}
				return undefined;
			});

			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(NodeOperationError);
			await expect(node.execute.call(mockExecuteFunctions)).rejects.toThrow(
				'You cannot send ephemeral messages using User type "By username". Please use "From List" or "By ID".',
			);
		});
	});
});
