import { mockDeep } from 'jest-mock-extended';
import moment from 'moment-timezone';
import type { IPollFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import * as GenericFunctions from '../GenericFunctions';
import { GoogleCalendarTrigger } from '../GoogleCalendarTrigger.node';

jest.mock('../GenericFunctions', () => ({
	googleApiRequest: jest.fn(),
	googleApiRequestAllItems: jest.fn(),
	encodeURIComponentOnce: jest.fn(),
	getCalendars: jest.fn(),
}));

describe('GoogleCalendarTrigger', () => {
	let trigger: GoogleCalendarTrigger;
	let mockPollFunctions: jest.Mocked<IPollFunctions>;
	let mockNode: INode;

	const googleApiRequestSpy = jest.spyOn(GenericFunctions, 'googleApiRequest');
	const googleApiRequestAllItemsSpy = jest.spyOn(GenericFunctions, 'googleApiRequestAllItems');
	const encodeURIComponentOnceSpy = jest.spyOn(GenericFunctions, 'encodeURIComponentOnce');

	beforeEach(() => {
		trigger = new GoogleCalendarTrigger();
		mockPollFunctions = mockDeep<IPollFunctions>();
		mockNode = {
			id: 'test-node-id',
			name: 'Google Calendar Trigger Test',
			type: 'n8n-nodes-base.googleCalendarTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};

		jest.clearAllMocks();

		mockPollFunctions.getNode.mockReturnValue(mockNode);
		mockPollFunctions.getWorkflowStaticData.mockReturnValue({});
		(mockPollFunctions.helpers.returnJsonArray as jest.Mock).mockImplementation((data: any[]) =>
			data.map((item: any, index: number) => ({ json: item, pairedItem: { item: index } })),
		);
		encodeURIComponentOnceSpy.mockImplementation((uri) => encodeURIComponent(uri));
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			expect(trigger.description.displayName).toBe('Google Calendar Trigger');
			expect(trigger.description.name).toBe('googleCalendarTrigger');
			expect(trigger.description.group).toEqual(['trigger']);
			expect(trigger.description.version).toBe(1);
			expect(trigger.description.polling).toBe(true);
		});

		it('should have correct credentials configuration', () => {
			expect(trigger.description.credentials).toEqual([
				{
					name: 'googleCalendarOAuth2Api',
					required: true,
				},
			]);
		});

		it('should have correct node structure', () => {
			expect(trigger.description.inputs).toEqual([]);
			expect(trigger.description.outputs).toHaveLength(1);
		});

		it('should have required properties defined', () => {
			const properties = trigger.description.properties;
			expect(properties).toBeDefined();
			expect(properties.length).toBe(3);

			const calendarProp = properties.find((p) => p.name === 'calendarId');
			expect(calendarProp).toBeDefined();
			expect(calendarProp?.required).toBe(true);

			const triggerProp = properties.find((p) => p.name === 'triggerOn');
			expect(triggerProp).toBeDefined();
			expect(triggerProp?.required).toBe(true);
		});

		it('should have correct trigger options', () => {
			const triggerProp = trigger.description.properties.find((p) => p.name === 'triggerOn');
			expect(triggerProp?.type).toBe('options');
			expect(triggerProp?.options).toEqual([
				{ name: 'Event Cancelled', value: 'eventCancelled' },
				{ name: 'Event Created', value: 'eventCreated' },
				{ name: 'Event Ended', value: 'eventEnded' },
				{ name: 'Event Started', value: 'eventStarted' },
				{ name: 'Event Updated', value: 'eventUpdated' },
			]);
		});
	});

	describe('Methods', () => {
		it('should have listSearch methods defined', () => {
			expect(trigger.methods?.listSearch?.getCalendars).toBe(GenericFunctions.getCalendars);
		});
	});

	describe('Poll Function - Parameter Validation', () => {
		beforeEach(() => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | any[]> = {
					'pollTimes.item': [{ hour: 9, minute: 0 }],
					triggerOn: 'eventCreated',
					calendarId: 'test@example.com',
					'options.matchTerm': '',
				};
				return params[paramName] ?? '';
			});
		});

		it('should throw error when no poll times are set', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'pollTimes.item') return [];
				return 'test-value';
			});

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow('Please set a poll time');
		});

		it('should throw error when triggerOn is empty', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'triggerOn') return '';
				if (paramName === 'pollTimes.item') return [{ hour: 9 }];
				return 'test-value';
			});

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow('Please select an event');
		});

		it('should throw error when calendarId is empty', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'calendarId') return '';
				if (paramName === 'pollTimes.item') return [{ hour: 9 }];
				if (paramName === 'triggerOn') return 'eventCreated';
				return 'test-value';
			});

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow(
				'Please select a calendar',
			);
		});
	});

	describe('Poll Function - Event Created Trigger', () => {
		beforeEach(() => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | any[]> = {
					'pollTimes.item': [{ hour: 9, minute: 0 }],
					triggerOn: 'eventCreated',
					calendarId: 'test@example.com',
					'options.matchTerm': '',
				};
				return params[paramName] ?? '';
			});
			mockPollFunctions.getMode.mockReturnValue('trigger');
		});

		it('should fetch events and filter by created date', async () => {
			const now = moment();
			const webhookData = { lastTimeChecked: now.clone().subtract(2, 'hours').format() };
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(webhookData);

			const mockEvents = [
				{
					id: '1',
					summary: 'Test Event 1',
					created: now.clone().subtract(1, 'hour').format(),
					updated: now.format(),
				},
				{
					id: '2',
					summary: 'Test Event 2',
					created: now.clone().subtract(3, 'hours').format(),
					updated: now.format(),
				},
			];

			googleApiRequestAllItemsSpy.mockResolvedValue(mockEvents);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'items',
				'GET',
				'/calendar/v3/calendars/test%40example.com/events',
				{},
				expect.objectContaining({
					showDeleted: false,
					orderBy: 'updated',
				}),
			);

			expect(result).toBeDefined();
			expect(result?.[0]).toHaveLength(1);
			expect(result?.[0][0].json.id).toBe('1');
		});

		it('should include match term in query when provided', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | any[]> = {
					'pollTimes.item': [{ hour: 9 }],
					triggerOn: 'eventCreated',
					calendarId: 'test@example.com',
					'options.matchTerm': 'meeting',
				};
				return params[paramName] ?? '';
			});

			googleApiRequestAllItemsSpy.mockResolvedValue([]);

			await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'items',
				'GET',
				'/calendar/v3/calendars/test%40example.com/events',
				{},
				expect.objectContaining({
					q: 'meeting',
				}),
			);
		});

		it('should return null when no events found', async () => {
			googleApiRequestAllItemsSpy.mockResolvedValue([]);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeNull();
		});
	});

	describe('Poll Function - Event Updated Trigger', () => {
		beforeEach(() => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | any[]> = {
					'pollTimes.item': [{ hour: 9 }],
					triggerOn: 'eventUpdated',
					calendarId: 'test@example.com',
					'options.matchTerm': '',
				};
				return params[paramName] ?? '';
			});
			mockPollFunctions.getMode.mockReturnValue('trigger');
		});

		it('should filter out events that were not actually updated', async () => {
			const baseTime = moment();
			const mockEvents = [
				{
					id: '1',
					summary: 'Actually Updated Event',
					created: baseTime.clone().subtract(2, 'hours').format('YYYY-MM-DDTHH:mm:ss'),
					updated: baseTime.clone().subtract(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
				},
				{
					id: '2',
					summary: 'Not Updated Event',
					created: baseTime.clone().subtract(2, 'hours').format('YYYY-MM-DDTHH:mm:ss'),
					updated: baseTime.clone().subtract(2, 'hours').format('YYYY-MM-DDTHH:mm:ss'),
				},
			];

			googleApiRequestAllItemsSpy.mockResolvedValue(mockEvents);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeDefined();
			expect(result![0]).toHaveLength(1);
			expect(result![0][0].json.id).toBe('1');
		});
	});

	describe('Poll Function - Event Cancelled Trigger', () => {
		beforeEach(() => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | any[]> = {
					'pollTimes.item': [{ hour: 9 }],
					triggerOn: 'eventCancelled',
					calendarId: 'test@example.com',
					'options.matchTerm': '',
				};
				return params[paramName] ?? '';
			});
			mockPollFunctions.getMode.mockReturnValue('trigger');
		});

		it('should set showDeleted to true and filter cancelled events', async () => {
			const mockEvents = [
				{
					id: '1',
					summary: 'Cancelled Event',
					status: 'cancelled',
					created: moment().subtract(2, 'hours').format('YYYY-MM-DDTHH:mm:ss'),
					updated: moment().subtract(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
				},
				{
					id: '2',
					summary: 'Active Event',
					status: 'confirmed',
					created: moment().subtract(2, 'hours').format('YYYY-MM-DDTHH:mm:ss'),
					updated: moment().subtract(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
				},
			];

			googleApiRequestAllItemsSpy.mockResolvedValue(mockEvents);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'items',
				'GET',
				'/calendar/v3/calendars/test%40example.com/events',
				{},
				expect.objectContaining({
					showDeleted: true,
				}),
			);

			expect(result).toBeDefined();
			expect(result![0]).toHaveLength(1);
			expect(result![0][0].json.id).toBe('1');
			expect(result![0][0].json.status).toBe('cancelled');
		});
	});

	describe('Poll Function - Event Started/Ended Triggers', () => {
		beforeEach(() => {
			mockPollFunctions.getMode.mockReturnValue('trigger');
		});

		it('should handle eventStarted trigger with time-based filtering', async () => {
			const now = moment();
			const webhookData = { lastTimeChecked: now.clone().subtract(1, 'hour').format() };
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(webhookData);

			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | any[]> = {
					'pollTimes.item': [{ hour: 9 }],
					triggerOn: 'eventStarted',
					calendarId: 'test@example.com',
					'options.matchTerm': '',
				};
				return params[paramName] ?? '';
			});

			const mockEvents = [
				{
					id: '1',
					summary: 'Started Event',
					start: { dateTime: now.clone().subtract(30, 'minutes').format() },
					end: { dateTime: now.clone().add(30, 'minutes').format() },
				},
				{
					id: '2',
					summary: 'Future Event',
					start: { dateTime: now.clone().add(2, 'hours').format() },
					end: { dateTime: now.clone().add(3, 'hours').format() },
				},
			];

			googleApiRequestAllItemsSpy.mockResolvedValue(mockEvents);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'items',
				'GET',
				'/calendar/v3/calendars/test%40example.com/events',
				{},
				expect.objectContaining({
					singleEvents: true,
					orderBy: 'startTime',
				}),
			);

			expect(result).toBeDefined();
			expect(result?.[0]).toHaveLength(1);
			expect(result?.[0][0].json.id).toBe('1');
		});

		it('should handle eventEnded trigger with time-based filtering', async () => {
			const now = moment();
			const webhookData = { lastTimeChecked: now.clone().subtract(1, 'hour').format() };
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(webhookData);

			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | any[]> = {
					'pollTimes.item': [{ hour: 9 }],
					triggerOn: 'eventEnded',
					calendarId: 'test@example.com',
					'options.matchTerm': '',
				};
				return params[paramName] ?? '';
			});

			const mockEvents = [
				{
					id: '1',
					summary: 'Ended Event',
					start: { dateTime: now.clone().subtract(2, 'hours').format() },
					end: { dateTime: now.clone().subtract(30, 'minutes').format() },
				},
				{
					id: '2',
					summary: 'Ongoing Event',
					start: { dateTime: now.clone().subtract(1, 'hour').format() },
					end: { dateTime: now.clone().add(1, 'hour').format() },
				},
			];

			googleApiRequestAllItemsSpy.mockResolvedValue(mockEvents);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeDefined();
			expect(result?.[0]).toHaveLength(1);
			expect(result?.[0][0].json.id).toBe('1');
		});
	});

	describe('Poll Function - Manual Mode', () => {
		beforeEach(() => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | any[]> = {
					'pollTimes.item': [{ hour: 9 }],
					triggerOn: 'eventCreated',
					calendarId: 'test@example.com',
					'options.matchTerm': '',
				};
				return params[paramName] ?? '';
			});
			mockPollFunctions.getMode.mockReturnValue('manual');
		});

		it('should fetch single event in manual mode', async () => {
			const mockResponse = {
				items: [
					{
						id: '1',
						summary: 'Test Event',
					},
				],
			};

			googleApiRequestSpy.mockResolvedValue(mockResponse);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/calendar/v3/calendars/test%40example.com/events',
				{},
				expect.objectContaining({
					maxResults: 1,
				}),
			);

			expect(result).toBeDefined();
			expect(result![0]).toHaveLength(1);
			expect(result![0][0].json.id).toBe('1');
		});

		it('should throw NodeApiError when no data found in manual mode', async () => {
			googleApiRequestSpy.mockResolvedValue({ items: [] });

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow(NodeApiError);
			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow(
				'No data with the current filter could be found',
			);
		});
	});

	describe('Poll Function - Error Handling', () => {
		beforeEach(() => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | any[]> = {
					'pollTimes.item': [{ hour: 9 }],
					triggerOn: 'eventCreated',
					calendarId: 'test@example.com',
					'options.matchTerm': '',
				};
				return params[paramName] ?? '';
			});
			mockPollFunctions.getMode.mockReturnValue('trigger');
		});

		it('should handle API request errors', async () => {
			const apiError = new Error('API Error');
			googleApiRequestAllItemsSpy.mockRejectedValue(apiError);

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow('API Error');
		});

		it('should handle invalid calendar ID', async () => {
			encodeURIComponentOnceSpy.mockImplementation((uri) => {
				if (!uri) throw new Error('Invalid calendar ID');
				return encodeURIComponent(uri);
			});

			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'calendarId') return null;
				const params: Record<string, string | any[]> = {
					'pollTimes.item': [{ hour: 9 }],
					triggerOn: 'eventCreated',
					'options.matchTerm': '',
				};
				return params[paramName] ?? '';
			});

			await expect(trigger.poll.call(mockPollFunctions)).rejects.toThrow('Invalid calendar ID');
		});
	});

	describe('Poll Function - State Management', () => {
		it('should update lastTimeChecked in webhook data', async () => {
			const mockWebhookData = { lastTimeChecked: moment().subtract(1, 'day').format() };
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWebhookData);

			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | any[]> = {
					'pollTimes.item': [{ hour: 9 }],
					triggerOn: 'eventCreated',
					calendarId: 'test@example.com',
					'options.matchTerm': '',
				};
				return params[paramName] ?? '';
			});

			mockPollFunctions.getMode.mockReturnValue('trigger');
			googleApiRequestAllItemsSpy.mockResolvedValue([]);

			await trigger.poll.call(mockPollFunctions);

			expect(mockWebhookData.lastTimeChecked).toBeDefined();
			expect(moment(mockWebhookData.lastTimeChecked).isValid()).toBe(true);
		});

		it('should use current time as startDate when no lastTimeChecked exists', async () => {
			const mockWebhookData = {};
			mockPollFunctions.getWorkflowStaticData.mockReturnValue(mockWebhookData);

			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | any[]> = {
					'pollTimes.item': [{ hour: 9 }],
					triggerOn: 'eventCreated',
					calendarId: 'test@example.com',
					'options.matchTerm': '',
				};
				return params[paramName] ?? '';
			});

			mockPollFunctions.getMode.mockReturnValue('trigger');
			googleApiRequestAllItemsSpy.mockResolvedValue([]);

			await trigger.poll.call(mockPollFunctions);

			expect(googleApiRequestAllItemsSpy).toHaveBeenCalledWith(
				'items',
				'GET',
				'/calendar/v3/calendars/test%40example.com/events',
				{},
				expect.objectContaining({
					updatedMin: expect.any(String),
				}),
			);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty events array', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | any[]> = {
					'pollTimes.item': [{ hour: 9 }],
					triggerOn: 'eventCreated',
					calendarId: 'test@example.com',
					'options.matchTerm': '',
				};
				return params[paramName] ?? '';
			});

			mockPollFunctions.getMode.mockReturnValue('trigger');
			googleApiRequestAllItemsSpy.mockResolvedValue([]);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeNull();
		});

		it('should handle events without required fields', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | any[]> = {
					'pollTimes.item': [{ hour: 9 }],
					triggerOn: 'eventCreated', // Use eventCreated to avoid dateTime access issues
					calendarId: 'test@example.com',
					'options.matchTerm': '',
				};
				return params[paramName] ?? '';
			});

			mockPollFunctions.getMode.mockReturnValue('trigger');

			const mockEvents = [
				{
					id: '1',
					summary: 'Event without created field',
					// Missing created and updated fields
				},
			];

			googleApiRequestAllItemsSpy.mockResolvedValue(mockEvents);

			// This should not throw an error but handle gracefully
			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeNull();
		});

		it('should handle malformed date strings gracefully', async () => {
			mockPollFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params: Record<string, string | any[]> = {
					'pollTimes.item': [{ hour: 9 }],
					triggerOn: 'eventCreated',
					calendarId: 'test@example.com',
					'options.matchTerm': '',
				};
				return params[paramName] ?? '';
			});

			mockPollFunctions.getMode.mockReturnValue('trigger');

			const mockEvents = [
				{
					id: '1',
					summary: 'Event with invalid date',
					created: 'invalid-date',
					updated: 'invalid-date',
				},
			];

			googleApiRequestAllItemsSpy.mockResolvedValue(mockEvents);

			const result = await trigger.poll.call(mockPollFunctions);

			expect(result).toBeNull();
		});
	});
});
