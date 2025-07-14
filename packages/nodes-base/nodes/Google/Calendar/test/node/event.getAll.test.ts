import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { INode, IExecuteFunctions, IDataObject } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { GoogleCalendar } from '../../GoogleCalendar.node';

let response: IDataObject[] | undefined = [];
let responseWithRetries: IDataObject | undefined = {};

jest.mock('../../GenericFunctions', () => {
	const originalModule = jest.requireActual('../../GenericFunctions');
	return {
		...originalModule,
		getTimezones: jest.fn(),
		googleApiRequest: jest.fn(),
		googleApiRequestAllItems: jest.fn(async function () {
			return (() => response)();
		}),
		googleApiRequestWithRetries: jest.fn(async function () {
			return (() => responseWithRetries)();
		}),
		addNextOccurrence: jest.fn(function (data: IDataObject[]) {
			return data;
		}),
	};
});

describe('Google Calendar Node', () => {
	let googleCalendar: GoogleCalendar;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		googleCalendar = new GoogleCalendar();
		mockExecuteFunctions = mock<IExecuteFunctions>({
			getInputData: jest.fn(),
			getNode: jest.fn(),
			getNodeParameter: jest.fn(),
			getTimezone: jest.fn(),
			helpers: {
				constructExecutionMetaData: jest.fn().mockReturnValue([]),
			},
		});
		response = undefined;
		responseWithRetries = undefined;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Google Calendar > Event > Get Many', () => {
		it('should configure get all request parameters in version 1.3', async () => {
			// pre loop setup
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('event');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('getAll');
			mockExecuteFunctions.getTimezone.mockReturnValueOnce('Europe/Berlin');
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.3 }));

			//operation setup
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(true); //returnAll
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('myCalendar'); //calendar
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({
				iCalUID: 'uid',
				maxAttendees: 25,
				orderBy: 'startTime',
				query: 'test query',
				recurringEventHandling: 'expand',
				showDeleted: true,
				showHiddenInvitations: true,
				updatedMin: '2024-12-21T00:00:00',
			}); //options
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('Europe/Berlin'); //options.timeZone
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('2024-12-20T00:00:00'); //timeMin
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('2024-12-26T00:00:00'); //timeMax

			await googleCalendar.execute.call(mockExecuteFunctions);

			expect(genericFunctions.googleApiRequestAllItems).toHaveBeenCalledWith(
				'items',
				'GET',
				'/calendar/v3/calendars/myCalendar/events',
				{},
				{
					iCalUID: 'uid',
					maxAttendees: 25,
					orderBy: 'startTime',
					q: 'test query',
					showDeleted: true,
					showHiddenInvitations: true,
					singleEvents: true,
					timeMax: '2024-12-25T23:00:00Z',
					timeMin: '2024-12-19T23:00:00Z',
					timeZone: 'Europe/Berlin',
					updatedMin: '2024-12-20T23:00:00Z',
				},
			);
		});

		it('should configure get all recurringEventHandling equals next in version 1.3', async () => {
			// pre loop setup
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('event');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('getAll');
			mockExecuteFunctions.getTimezone.mockReturnValueOnce('Europe/Berlin');
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.3 }));

			//operation setup
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(true); //returnAll
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('myCalendar'); //calendar
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({
				recurringEventHandling: 'next',
			}); //options
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('Europe/Berlin'); //options.timeZone
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('2024-12-20T00:00:00'); //timeMin
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('2024-12-26T00:00:00'); //timeMax

			response = [
				{
					recurrence: ['RRULE:FREQ=DAILY;COUNT=5'],
				},
			];

			responseWithRetries = { items: [] };

			const result = await googleCalendar.execute.call(mockExecuteFunctions);

			expect(genericFunctions.googleApiRequestAllItems).toHaveBeenCalledWith(
				'items',
				'GET',
				'/calendar/v3/calendars/myCalendar/events',
				{},
				{
					timeMax: '2024-12-25T23:00:00Z',
					timeMin: '2024-12-19T23:00:00Z',
					timeZone: 'Europe/Berlin',
				},
			);
			expect(genericFunctions.googleApiRequestWithRetries).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					itemIndex: 0,
					resource: '/calendar/v3/calendars/myCalendar/events/undefined/instances',
				}),
			);

			expect(result).toEqual([[]]);
		});

		it('should configure get all recurringEventHandling equals first in version 1.3', async () => {
			// pre loop setup
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('event');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('getAll');
			mockExecuteFunctions.getTimezone.mockReturnValueOnce('Europe/Berlin');
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.3 }));

			//operation setup
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(true); //returnAll
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('myCalendar'); //calendar
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({
				recurringEventHandling: 'first',
			}); //options
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('Europe/Berlin'); //options.timeZone
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('2024-12-20T00:00:00'); //timeMin
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('2024-12-26T00:00:00'); //timeMax

			response = [
				{
					recurrence: ['RRULE:FREQ=DAILY;COUNT=5'],
					created: '2024-12-19T00:00:00',
				},
				{
					recurrence: ['RRULE:FREQ=DAILY;COUNT=5'],
					created: '2024-12-27T00:00:00',
				},
			];

			const result = await googleCalendar.execute.call(mockExecuteFunctions);

			expect(result).toEqual([[]]);
		});

		it('should configure get all should have hint in version 1.3', async () => {
			// pre loop setup
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('event');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('getAll');
			mockExecuteFunctions.getTimezone.mockReturnValueOnce('Europe/Berlin');
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.3 }));

			//operation setup
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(true); //returnAll
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('myCalendar'); //calendar
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); //options
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('Europe/Berlin'); //options.timeZone
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('2024-12-20T00:00:00'); //timeMin
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(''); //timeMax

			response = [
				{
					recurrence: ['RRULE:FREQ=DAILY;COUNT=5'],
					created: '2024-12-25T00:00:00',
					recurringEventId: '1',
					start: { dateTime: '2027-12-25T00:00:00' },
				},
			];

			await googleCalendar.execute.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.addExecutionHints).toHaveBeenCalledWith({
				message:
					"Some events repeat far into the future. To return less of them, add a 'Before' date or change the 'Recurring Event Handling' option.",
				location: 'outputPane',
			});
		});
	});
});
