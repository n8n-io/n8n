import { mockDeep } from 'jest-mock-extended';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

import {
	searchContacts,
	searchCalendars,
	searchDrafts,
	searchMessages,
	searchEvents,
	searchFolders,
	searchAttachments,
} from '../../../v2/methods/listSearch';
import * as transport from '../../../v2/transport';
import * as utils from '../../../v2/helpers/utils';

jest.mock('../../../v2/transport');
jest.mock('../../../v2/helpers/utils');

const mockTransport = transport as jest.Mocked<typeof transport>;
const mockUtils = utils as jest.Mocked<typeof utils>;

describe('MicrosoftOutlookV2 - listSearch methods', () => {
	let mockLoadOptionsFunctions: jest.Mocked<ILoadOptionsFunctions>;

	beforeEach(() => {
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		jest.clearAllMocks();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('searchContacts', () => {
		it('should search contacts without filter', async () => {
			const mockResponse = {
				value: [
					{ id: 'contact1', displayName: 'John Doe' },
					{ id: 'contact2', displayName: 'Jane Smith' },
				],
				'@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/contacts?$skip=100',
			};

			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);

			const result = await searchContacts.call(mockLoadOptionsFunctions);

			expect(mockTransport.microsoftApiRequest).toHaveBeenCalledWith(
				'GET',
				'/contacts',
				undefined,
				{
					$select: 'id,displayName',
					$top: 100,
				},
			);
			expect(result).toEqual({
				results: [
					{ name: 'John Doe', value: 'contact1' },
					{ name: 'Jane Smith', value: 'contact2' },
				],
				paginationToken: 'https://graph.microsoft.com/v1.0/me/contacts?$skip=100',
			});
		});

		it('should search contacts with filter', async () => {
			const mockResponse = {
				value: [{ id: 'contact1', displayName: 'John Doe' }],
			};

			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);

			const result = await searchContacts.call(mockLoadOptionsFunctions, 'John');

			expect(mockTransport.microsoftApiRequest).toHaveBeenCalledWith(
				'GET',
				'/contacts',
				undefined,
				{
					$select: 'id,displayName',
					$top: 100,
					$filter: "contains(displayName, 'John')",
				},
			);
			expect(result).toEqual({
				results: [{ name: 'John Doe', value: 'contact1' }],
				paginationToken: undefined,
			});
		});

		it('should handle pagination token', async () => {
			const mockResponse = {
				value: [{ id: 'contact1', displayName: 'John Doe' }],
			};

			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);

			const paginationToken = 'https://graph.microsoft.com/v1.0/me/contacts?$skip=100';
			await searchContacts.call(mockLoadOptionsFunctions, undefined, paginationToken);

			expect(mockTransport.microsoftApiRequest).toHaveBeenCalledWith(
				'GET',
				'',
				undefined,
				undefined,
				paginationToken,
			);
		});
	});

	describe('searchCalendars', () => {
		it('should search calendars successfully', async () => {
			const mockResponse = {
				value: [
					{ id: 'cal1', name: 'Work Calendar' },
					{ id: 'cal2', name: 'Personal Calendar' },
				],
			};

			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);

			const result = await searchCalendars.call(mockLoadOptionsFunctions);

			expect(mockTransport.microsoftApiRequest).toHaveBeenCalledWith(
				'GET',
				'/calendars',
				undefined,
				{
					$select: 'id,name',
					$top: 100,
				},
			);
			expect(result).toEqual({
				results: [
					{ name: 'Work Calendar', value: 'cal1' },
					{ name: 'Personal Calendar', value: 'cal2' },
				],
				paginationToken: undefined,
			});
		});
	});

	describe('searchDrafts', () => {
		it('should search drafts without filter', async () => {
			const mockResponse = {
				value: [
					{
						id: 'draft1',
						subject: 'Draft Email',
						bodyPreview: 'This is a draft',
						webLink: 'https://outlook.office365.com/mail/draft1',
					},
				],
			};

			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);

			const result = await searchDrafts.call(mockLoadOptionsFunctions);

			expect(mockTransport.microsoftApiRequest).toHaveBeenCalledWith(
				'GET',
				'/messages',
				undefined,
				{
					$select: 'id,subject,bodyPreview,webLink',
					$top: 100,
					$filter: 'isDraft eq true',
				},
			);
			expect(result).toEqual({
				results: [
					{
						name: 'Draft Email',
						value: 'draft1',
						url: 'https://outlook.office365.com/mail/draft1',
					},
				],
				paginationToken: undefined,
			});
		});

		it('should search drafts with filter', async () => {
			const mockResponse = {
				value: [
					{
						id: 'draft1',
						subject: 'Important Draft',
						bodyPreview: 'This is an important draft',
						webLink: 'https://outlook.office365.com/mail/draft1',
					},
				],
			};

			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);

			await searchDrafts.call(mockLoadOptionsFunctions, 'Important');

			expect(mockTransport.microsoftApiRequest).toHaveBeenCalledWith(
				'GET',
				'/messages',
				undefined,
				{
					$select: 'id,subject,bodyPreview,webLink',
					$top: 100,
					$filter: "isDraft eq true AND contains(subject, 'Important')",
				},
			);
		});

		it('should fallback to bodyPreview when subject is empty', async () => {
			const mockResponse = {
				value: [
					{
						id: 'draft1',
						subject: '',
						bodyPreview: 'This is a draft without subject',
						webLink: 'https://outlook.office365.com/mail/draft1',
					},
				],
			};

			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);

			const result = await searchDrafts.call(mockLoadOptionsFunctions);

			expect(result.results[0].name).toBe('This is a draft without subject');
		});
	});

	describe('searchMessages', () => {
		it('should search messages successfully', async () => {
			const mockResponse = {
				value: [
					{
						id: 'msg1',
						subject: 'Hello World',
						bodyPreview: 'This is a message',
						webLink: 'https://outlook.office365.com/mail/msg1',
					},
				],
			};

			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);

			const result = await searchMessages.call(mockLoadOptionsFunctions);

			expect(mockTransport.microsoftApiRequest).toHaveBeenCalledWith(
				'GET',
				'/messages',
				undefined,
				{
					$select: 'id,subject,bodyPreview,webLink',
					$top: 100,
				},
			);
			expect(result).toEqual({
				results: [
					{
						name: 'Hello World',
						value: 'msg1',
						url: 'https://outlook.office365.com/mail/msg1',
					},
				],
				paginationToken: undefined,
			});
		});

		it('should search messages with filter', async () => {
			const mockResponse = {
				value: [
					{
						id: 'msg1',
						subject: 'Meeting Invite',
						bodyPreview: 'You are invited to a meeting',
						webLink: 'https://outlook.office365.com/mail/msg1',
					},
				],
			};

			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);

			await searchMessages.call(mockLoadOptionsFunctions, 'Meeting');

			expect(mockTransport.microsoftApiRequest).toHaveBeenCalledWith(
				'GET',
				'/messages',
				undefined,
				{
					$select: 'id,subject,bodyPreview,webLink',
					$top: 100,
					$filter: "contains(subject, 'Meeting')",
				},
			);
		});
	});

	describe('searchEvents', () => {
		beforeEach(() => {
			mockUtils.encodeOutlookId.mockReturnValue('encoded-id');
		});

		it('should search events successfully', async () => {
			const calendarId = 'cal123';
			const mockResponse = {
				value: [
					{
						id: 'event1',
						subject: 'Team Meeting',
						bodyPreview: 'Weekly team sync',
					},
				],
			};

			mockLoadOptionsFunctions.getNodeParameter.mockReturnValue(calendarId);
			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);

			const result = await searchEvents.call(mockLoadOptionsFunctions);

			expect(mockLoadOptionsFunctions.getNodeParameter).toHaveBeenCalledWith(
				'calendarId',
				undefined,
				{
					extractValue: true,
				},
			);
			expect(mockTransport.microsoftApiRequest).toHaveBeenCalledWith(
				'GET',
				`/calendars/${calendarId}/events`,
				undefined,
				{
					$select: 'id,subject,bodyPreview',
					$top: 100,
				},
			);
			expect(result).toEqual({
				results: [
					{
						name: 'Team Meeting',
						value: 'event1',
						url: 'https://outlook.office365.com/calendar/item/encoded-id',
					},
				],
				paginationToken: undefined,
			});
		});

		it('should search events with filter', async () => {
			const calendarId = 'cal123';
			const mockResponse = {
				value: [
					{
						id: 'event1',
						subject: 'Project Review',
						bodyPreview: 'Review project progress',
					},
				],
			};

			mockLoadOptionsFunctions.getNodeParameter.mockReturnValue(calendarId);
			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);

			await searchEvents.call(mockLoadOptionsFunctions, 'Project');

			expect(mockTransport.microsoftApiRequest).toHaveBeenCalledWith(
				'GET',
				`/calendars/${calendarId}/events`,
				undefined,
				{
					$select: 'id,subject,bodyPreview',
					$top: 100,
					$filter: "contains(subject, 'Project')",
				},
			);
		});
	});

	describe('searchFolders', () => {
		beforeEach(() => {
			mockUtils.encodeOutlookId.mockReturnValue('encoded-folder-id');
		});

		it('should search folders successfully', async () => {
			const mockResponse = {
				value: [
					{ id: 'folder1', displayName: 'Inbox' },
					{ id: 'folder2', displayName: 'Sent Items' },
				],
			};
			const mockFolders = [
				{ id: 'folder1', displayName: 'Inbox' },
				{ id: 'folder2', displayName: 'Sent Items' },
				{ id: 'subfolder1', displayName: 'Work' },
			];

			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);
			mockTransport.getSubfolders.mockResolvedValue(mockFolders);

			const result = await searchFolders.call(mockLoadOptionsFunctions);

			expect(mockTransport.microsoftApiRequest).toHaveBeenCalledWith(
				'GET',
				'/mailFolders',
				undefined,
				{
					$top: 100,
				},
			);
			expect(mockTransport.getSubfolders).toHaveBeenCalledWith(mockResponse.value);
			expect(result).toEqual({
				results: [
					{
						name: 'Inbox',
						value: 'folder1',
						url: 'https://outlook.office365.com/mail/encoded-folder-id',
					},
					{
						name: 'Sent Items',
						value: 'folder2',
						url: 'https://outlook.office365.com/mail/encoded-folder-id',
					},
					{
						name: 'Work',
						value: 'subfolder1',
						url: 'https://outlook.office365.com/mail/encoded-folder-id',
					},
				],
				paginationToken: undefined,
			});
		});

		it('should filter folders by name', async () => {
			const mockResponse = {
				value: [
					{ id: 'folder1', displayName: 'Inbox' },
					{ id: 'folder2', displayName: 'Sent Items' },
				],
			};
			const mockFolders = [
				{ id: 'folder1', displayName: 'Inbox' },
				{ id: 'folder2', displayName: 'Sent Items' },
				{ id: 'folder3', displayName: 'Work Folder' },
			];

			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);
			mockTransport.getSubfolders.mockResolvedValue(mockFolders);

			const result = await searchFolders.call(mockLoadOptionsFunctions, 'work');

			expect(result.results).toHaveLength(1);
			expect(result.results[0].name).toBe('Work Folder');
		});

		it('should handle case-insensitive filtering', async () => {
			const mockResponse = {
				value: [{ id: 'folder1', displayName: 'IMPORTANT' }],
			};
			const mockFolders = [{ id: 'folder1', displayName: 'IMPORTANT' }];

			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);
			mockTransport.getSubfolders.mockResolvedValue(mockFolders);

			const result = await searchFolders.call(mockLoadOptionsFunctions, 'important');

			expect(result.results).toHaveLength(1);
			expect(result.results[0].name).toBe('IMPORTANT');
		});

		it('should handle empty displayName gracefully', async () => {
			const mockResponse = {
				value: [{ id: 'folder1', displayName: null }],
			};
			const mockFolders = [{ id: 'folder1', displayName: null }];

			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);
			mockTransport.getSubfolders.mockResolvedValue(mockFolders);

			const result = await searchFolders.call(mockLoadOptionsFunctions, 'test');

			expect(result.results).toHaveLength(0);
		});
	});

	describe('searchAttachments', () => {
		it('should search attachments successfully', async () => {
			const messageId = 'msg123';
			const mockResponse = {
				value: [
					{ id: 'att1', name: 'document.pdf' },
					{ id: 'att2', name: 'image.jpg' },
				],
			};

			mockLoadOptionsFunctions.getNodeParameter.mockReturnValue(messageId);
			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);

			const result = await searchAttachments.call(mockLoadOptionsFunctions);

			expect(mockLoadOptionsFunctions.getNodeParameter).toHaveBeenCalledWith(
				'messageId',
				undefined,
				{
					extractValue: true,
				},
			);
			expect(mockTransport.microsoftApiRequest).toHaveBeenCalledWith(
				'GET',
				`/messages/${messageId}/attachments`,
				undefined,
				{
					$select: 'id,name',
					$top: 100,
				},
			);
			expect(result).toEqual({
				results: [
					{ name: 'document.pdf', value: 'att1' },
					{ name: 'image.jpg', value: 'att2' },
				],
				paginationToken: undefined,
			});
		});

		it('should handle pagination for attachments', async () => {
			const messageId = 'msg123';
			const paginationToken =
				'https://graph.microsoft.com/v1.0/me/messages/msg123/attachments?$skip=100';
			const mockResponse = {
				value: [{ id: 'att1', name: 'document.pdf' }],
			};

			mockLoadOptionsFunctions.getNodeParameter.mockReturnValue(messageId);
			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);

			await searchAttachments.call(mockLoadOptionsFunctions, paginationToken);

			expect(mockTransport.microsoftApiRequest).toHaveBeenCalledWith(
				'GET',
				'',
				undefined,
				undefined,
				paginationToken,
			);
		});
	});

	describe('Error Handling', () => {
		it('should handle API errors in searchContacts', async () => {
			const apiError = new Error('API Error');
			mockTransport.microsoftApiRequest.mockRejectedValue(apiError);

			await expect(searchContacts.call(mockLoadOptionsFunctions)).rejects.toThrow('API Error');
		});

		it('should handle API errors in searchEvents', async () => {
			const apiError = new Error('Calendar not found');
			mockLoadOptionsFunctions.getNodeParameter.mockReturnValue('invalid-calendar');
			mockTransport.microsoftApiRequest.mockRejectedValue(apiError);

			await expect(searchEvents.call(mockLoadOptionsFunctions)).rejects.toThrow(
				'Calendar not found',
			);
		});

		it('should handle API errors in searchFolders', async () => {
			const apiError = new Error('Folders not accessible');
			mockTransport.microsoftApiRequest.mockRejectedValue(apiError);

			await expect(searchFolders.call(mockLoadOptionsFunctions)).rejects.toThrow(
				'Folders not accessible',
			);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty response arrays', async () => {
			const mockResponse = {
				value: [],
			};

			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);

			const result = await searchContacts.call(mockLoadOptionsFunctions);

			expect(result).toEqual({
				results: [],
				paginationToken: undefined,
			});
		});

		it('should handle missing properties in response', async () => {
			const mockResponse = {
				value: [{ id: 'contact1' }, { displayName: 'Jane Smith' }],
			};

			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);

			const result = await searchContacts.call(mockLoadOptionsFunctions);

			expect(result.results).toEqual([
				{ name: undefined, value: 'contact1' },
				{ name: 'Jane Smith', value: undefined },
			]);
		});

		it('should handle response without @odata.nextLink', async () => {
			const mockResponse = {
				value: [{ id: 'contact1', displayName: 'John Doe' }],
			};

			mockTransport.microsoftApiRequest.mockResolvedValue(mockResponse);

			const result = await searchContacts.call(mockLoadOptionsFunctions);

			expect(result.paginationToken).toBeUndefined();
		});
	});
});
