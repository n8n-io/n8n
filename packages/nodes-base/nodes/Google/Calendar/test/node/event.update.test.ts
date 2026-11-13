import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { INode, IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { GoogleCalendar } from '../../GoogleCalendar.node';

jest.mock('../../GenericFunctions', () => ({
	...jest.requireActual('../../GenericFunctions'),
	getTimezones: jest.fn(),
	googleApiRequest: jest.fn(),
	googleApiRequestAllItems: jest.fn(),
	addTimezoneToDate: jest.fn(),
	addNextOccurrence: jest.fn(),
}));

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
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Google Calendar > Event > Update', () => {
		it('should update replace attendees in version 1.1', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('event');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('update');
			mockExecuteFunctions.getTimezone.mockReturnValueOnce('Europe/Berlin');
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('myCalendar');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('myEvent');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(true);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({
				attendees: ['email1@mail.com'],
			});

			await googleCalendar.execute.call(mockExecuteFunctions);

			expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
				'PATCH',
				requestPath`/calendar/v3/calendars/myCalendar/events/myEvent`,
				{ attendees: [{ email: 'email1@mail.com' }] },
				{},
			);
		});

		it('should update replace attendees', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('event');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('update');
			mockExecuteFunctions.getTimezone.mockReturnValueOnce('Europe/Berlin');
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.2 }));
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('myCalendar');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('myEvent');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(true);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({
				attendeesUi: {
					values: {
						mode: 'replace',
						attendees: ['email1@mail.com'],
					},
				},
			});

			await googleCalendar.execute.call(mockExecuteFunctions);

			expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
				'PATCH',
				requestPath`/calendar/v3/calendars/myCalendar/events/myEvent`,
				{ attendees: [{ email: 'email1@mail.com' }] },
				{},
			);
		});

		it.each([
			[1.3, 'my%2Fcal', requestPath`/calendar/v3/calendars/${'my/cal'}/events/myEvent`],
			[1.4, 'my%2Fcal', requestPath`/calendar/v3/calendars/${'my%2Fcal'}/events/myEvent`],
			[1.4, 'my/cal', requestPath`/calendar/v3/calendars/${'my/cal'}/events/myEvent`],
		])(
			'should handle the calendar ID in node version %s for %s',
			async (typeVersion, calendar, path) => {
				mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
				mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('event');
				mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('update');
				mockExecuteFunctions.getTimezone.mockReturnValueOnce('Europe/Berlin');
				mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion }));
				mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(calendar);
				mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('myEvent');
				mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('instance');
				mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(true);
				mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});

				await googleCalendar.execute.call(mockExecuteFunctions);

				expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith('PATCH', path, {}, {});
			},
		);

		it('should update add attendees', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('event');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('update');
			mockExecuteFunctions.getTimezone.mockReturnValueOnce('Europe/Berlin');
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.2 }));
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('myCalendar');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('myEvent');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(true);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({
				attendeesUi: {
					values: {
						mode: 'add',
						attendees: ['email1@mail.com'],
					},
				},
			});
			(genericFunctions.googleApiRequest as jest.Mock).mockResolvedValueOnce({
				attendees: [{ email: 'email2@mail.com' }],
			});

			await googleCalendar.execute.call(mockExecuteFunctions);

			expect(genericFunctions.googleApiRequest).toHaveBeenCalledTimes(2);

			expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
				'GET',
				requestPath`/calendar/v3/calendars/myCalendar/events/myEvent`,
			);
			expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
				'PATCH',
				requestPath`/calendar/v3/calendars/myCalendar/events/myEvent`,
				{ attendees: [{ email: 'email2@mail.com' }, { email: 'email1@mail.com' }] },
				{},
			);
		});
	});
});
