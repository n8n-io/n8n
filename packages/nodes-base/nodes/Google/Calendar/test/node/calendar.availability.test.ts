import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { INode, IExecuteFunctions } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { GoogleCalendar } from '../../GoogleCalendar.node';

let googleApiRequestArgs: any[] = [];
const CALENDAR_ID = 'myCalendar';

jest.mock('../../GenericFunctions', () => ({
	getTimezones: jest.fn(),
	googleApiRequest: jest.fn(async (...args: any[]) => {
		googleApiRequestArgs = args;
		return { calendars: { [CALENDAR_ID]: { busy: [] } } };
	}),
	googleApiRequestAllItems: jest.fn(),
	addTimezoneToDate: jest.fn(),
	addNextOccurrence: jest.fn(),
	encodeURIComponentOnce: jest.fn(),
}));

describe('RespondToWebhook Node', () => {
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
		googleApiRequestArgs = [];
		jest.clearAllMocks();
	});

	describe('Google Calendar > Calendar > Availability', () => {
		it('should not have invalid timeMin and timeMax date', async () => {
			//pre loop setup
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('calendar');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('availability');
			mockExecuteFunctions.getTimezone.mockReturnValueOnce('Europe/Berlin');
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			//operation
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(CALENDAR_ID); // calendar
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(''); // timeMin, not set
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(''); // timeMax, not set
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // options
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(''); // options.timezone, default to timezone

			await googleCalendar.execute.call(mockExecuteFunctions);

			expect(genericFunctions.googleApiRequest).toHaveBeenCalledTimes(1);

			const body = googleApiRequestArgs[2] as {
				timeMin: string;
				timeMax: string;
			};

			expect(body).toBeDefined();
			expect(body.timeMin).not.toEqual('Invalid Date');
			expect(body.timeMax).not.toEqual('Invalid Date');
		});
	});
});
