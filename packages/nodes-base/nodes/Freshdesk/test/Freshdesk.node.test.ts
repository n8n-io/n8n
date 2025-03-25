import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { Freshdesk } from '../Freshdesk.node';
import * as GenericFunctions from '../GenericFunctions';

jest.mock('../GenericFunctions', () => {
	const originalModule = jest.requireActual('../GenericFunctions');
	return {
		...originalModule,
		freshdeskApiRequest: jest.fn(),
		freshdeskApiRequestAllItems: jest.fn(),
	};
});

describe('Freshdesk Node', () => {
	let freshdesk: Freshdesk;
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		freshdesk = new Freshdesk();
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockExecuteFunctions.helpers = {
			constructExecutionMetaData: jest.fn().mockReturnValue([]),
			returnJsonArray: jest.fn().mockImplementation((items) => items),
		} as any;
		jest.clearAllMocks();
	});

	describe('Conversation Operations', () => {
		describe('reply operation', () => {
			it('should reply to a ticket', async () => {
				// Mock input data
				const items = [{ json: { data: 'test' } }];
				mockExecuteFunctions.getInputData.mockReturnValue(items);

				// Mock node parameters
				mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
					if (parameterName === 'resource') return 'conversation';
					if (parameterName === 'operation') return 'reply';
					if (parameterName === 'ticketId') return '123';
					if (parameterName === 'body') return 'This is a reply to the ticket';
					if (parameterName === 'additionalFields')
						return {
							from_email: 'support@example.com',
							cc_emails: ['cc1@example.com', 'cc2@example.com'],
							bcc_emails: ['bcc@example.com'],
						};
					return '';
				});

				// Mock API response
				const mockReturnData = [
					{
						id: 456,
						user_id: 13073884546,
						from_email: '"Support" <support@example.com>',
						cc_emails: [],
						bcc_emails: [],
						body: '<div>This is a reply to the ticket</div>',
						body_text: 'This is a reply to the ticket',
						ticket_id: 123,
						to_emails: ['customer@example.com'],
						attachments: [],
						source_additional_info: null,
						created_at: '2025-03-25T13:51:42Z',
						updated_at: '2025-03-25T13:51:42Z',
					},
				];
				(GenericFunctions.freshdeskApiRequest as jest.Mock).mockResolvedValueOnce(mockReturnData);

				mockExecuteFunctions.helpers.returnJsonArray.mockReturnValueOnce(mockReturnData);
				mockExecuteFunctions.helpers.constructExecutionMetaData.mockReturnValueOnce(mockReturnData);
				// Execute the node
				const result = await freshdesk.execute.call(mockExecuteFunctions);

				// Assertions
				expect(GenericFunctions.freshdeskApiRequest).toHaveBeenCalledWith(
					'POST',
					'/tickets/123/reply',
					{
						body: 'This is a reply to the ticket',
						from_email: 'support@example.com',
						cc_emails: ['cc1@example.com', 'cc2@example.com'],
						bcc_emails: ['bcc@example.com'],
					},
				);
				expect(result).toEqual([mockReturnData]);
			});
		});

		describe('notes operation', () => {
			it('should add a note to a ticket', async () => {
				// Mock input data
				const items = [{ json: { data: 'test' } }];
				mockExecuteFunctions.getInputData.mockReturnValue(items);

				// Mock node parameters
				mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
					if (parameterName === 'resource') return 'conversation';
					if (parameterName === 'operation') return 'notes';
					if (parameterName === 'ticketId') return '123';
					if (parameterName === 'body') return 'This is a private note';
					if (parameterName === 'additionalFields')
						return {
							private: true,
							notify_emails: ['agent1@example.com', 'agent2@example.com'],
						};
					return '';
				});

				// Mock API response
				const mockReturnData = [
					{
						id: 789,
						body: 'This is a private note',
						body_text: 'This is a private note',
						private: true,
						user_id: 12345,
						ticket_id: 123,
						notify_emails: ['agent1@example.com', 'agent2@example.com'],
						created_at: '2025-03-25T13:51:42Z',
						updated_at: '2025-03-25T13:51:42Z',
						attachments: [],
					},
				];
				(GenericFunctions.freshdeskApiRequest as jest.Mock).mockResolvedValueOnce({});

				mockExecuteFunctions.helpers.returnJsonArray.mockReturnValueOnce(mockReturnData);
				mockExecuteFunctions.helpers.constructExecutionMetaData.mockReturnValueOnce(mockReturnData);

				// Execute the node
				const result = await freshdesk.execute.call(mockExecuteFunctions);

				// Assertions
				expect(GenericFunctions.freshdeskApiRequest).toHaveBeenCalledWith(
					'POST',
					'/tickets/123/notes',
					{
						body: 'This is a private note',
						private: true,
						notify_emails: ['agent1@example.com', 'agent2@example.com'],
					},
				);
				expect(result).toEqual([mockReturnData]);
			});
		});

		describe('update operation', () => {
			it('should update a note', async () => {
				// Mock input data
				const items: INodeExecutionData[] = [
					{
						json: {
							conversationId: '789',
							body: 'This is an updated note',
							private: false,
						},
					},
				];
				mockExecuteFunctions.getInputData.mockReturnValue(items);

				// Mock node parameters
				mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
					if (parameterName === 'resource') return 'conversation';
					if (parameterName === 'operation') return 'update';
					if (parameterName === 'conversationId') return '789';
					if (parameterName === 'body') return 'This is an updated note';
					if (parameterName === 'additionalFields')
						return {
							private: false,
						};
					return '';
				});

				// Mock API response
				const mockReturnData = [
					{
						id: 789,
						incoming: false,
						private: false,
						user_id: 13073884546,
						support_email: null,
						body: 'This is an updated note',
						body_text: 'This is an updated note',
						ticket_id: 123,
						to_emails: [],
						attachments: [],
						created_at: '2025-03-25T13:51:42Z',
						updated_at: '2025-03-25T13:51:42Z',
					},
				];
				(GenericFunctions.freshdeskApiRequest as jest.Mock).mockResolvedValueOnce({});

				mockExecuteFunctions.helpers.returnJsonArray.mockReturnValueOnce(mockReturnData);
				mockExecuteFunctions.helpers.constructExecutionMetaData.mockReturnValueOnce(mockReturnData);
				// Execute the node
				const result = await freshdesk.execute.call(mockExecuteFunctions);

				// Assertions
				expect(GenericFunctions.freshdeskApiRequest).toHaveBeenCalledWith(
					'PUT',
					'/conversations/789',
					{
						body: 'This is an updated note',
						private: false,
					},
				);
				expect(result).toEqual([mockReturnData]);
			});
		});

		describe('delete operation', () => {
			it('should delete a conversation', async () => {
				// Mock input data
				const items = [{ json: { conversationId: '789' } }];
				mockExecuteFunctions.getInputData.mockReturnValue(items);

				// Mock node parameters
				mockExecuteFunctions.getNodeParameter.mockImplementation((parameterName: string) => {
					if (parameterName === 'resource') return 'conversation';
					if (parameterName === 'operation') return 'delete';
					if (parameterName === 'conversationId') return '789';
					return '';
				});

				// Mock API response - typically empty for delete operations
				(GenericFunctions.freshdeskApiRequest as jest.Mock).mockResolvedValueOnce({});

				// Mock the constructExecutionMetaData helper
				const mockReturnData = [{ json: { success: true } }];
				mockExecuteFunctions.helpers.returnJsonArray.mockReturnValueOnce(mockReturnData);
				mockExecuteFunctions.helpers.constructExecutionMetaData.mockReturnValueOnce(mockReturnData);

				// Execute the node
				const result = await freshdesk.execute.call(mockExecuteFunctions);

				// Assertions
				expect(GenericFunctions.freshdeskApiRequest).toHaveBeenCalledWith(
					'DELETE',
					'/conversations/789',
				);
				expect(result).toEqual([mockReturnData]);
			});
		});
	});
});
