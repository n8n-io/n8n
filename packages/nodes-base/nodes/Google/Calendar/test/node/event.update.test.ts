import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import type { INode, IExecuteFunctions } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { GoogleCalendar } from '../../GoogleCalendar.node';
import type { Mock } from 'vitest';
import type * as _importType0 from '../../GenericFunctions';

vi.mock('../../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../../GenericFunctions')),
	getTimezones: vi.fn(),
	googleApiRequest: vi.fn(),
	googleApiRequestAllItems: vi.fn(),
	addTimezoneToDate: vi.fn(),
	addNextOccurrence: vi.fn(),
	encodeURIComponentOnce: vi.fn(),
}));

describe('Google Calendar Node', () => {
	let googleCalendar: GoogleCalendar;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		googleCalendar = new GoogleCalendar();
		mockExecuteFunctions = mock<IExecuteFunctions>({
			getInputData: vi.fn(),
			getNode: vi.fn(),
			getNodeParameter: vi.fn(),
			getTimezone: vi.fn(),
			helpers: {
				constructExecutionMetaData: vi.fn().mockReturnValue([]),
			},
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
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
				'/calendar/v3/calendars/undefined/events/myEvent',
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
				'/calendar/v3/calendars/undefined/events/myEvent',
				{ attendees: [{ email: 'email1@mail.com' }] },
				{},
			);
		});

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
			(genericFunctions.googleApiRequest as Mock).mockResolvedValueOnce({
				attendees: [{ email: 'email2@mail.com' }],
			});

			await googleCalendar.execute.call(mockExecuteFunctions);

			expect(genericFunctions.googleApiRequest).toHaveBeenCalledTimes(2);

			expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
				'GET',
				'/calendar/v3/calendars/undefined/events/myEvent',
			);
			expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
				'PATCH',
				'/calendar/v3/calendars/undefined/events/myEvent',
				{ attendees: [{ email: 'email2@mail.com' }, { email: 'email1@mail.com' }] },
				{},
			);
		});
	});
});
