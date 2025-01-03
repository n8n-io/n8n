import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { INode, IExecuteFunctions } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { GoogleCalendar } from '../../GoogleCalendar.node';

let googleApiRequestArgs: any[] = [];

jest.mock('../../GenericFunctions', () => ({
	getTimezones: jest.fn(),
	googleApiRequest: jest.fn(async (...args: any[]) => {
		googleApiRequestArgs = args;
		return {};
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

	describe('Google Calendar > Event > Create', () => {
		it('should not have invalid start and end date', async () => {
			//pre loop setup
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('event');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('create');
			mockExecuteFunctions.getTimezone.mockReturnValueOnce('Europe/Berlin');
			mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
			//operation
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('myCalendar');
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(''); // start, not set
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(''); // end, not set
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(true); // useDefaultReminders
			mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // additionalFields

			await googleCalendar.execute.call(mockExecuteFunctions);

			expect(genericFunctions.googleApiRequest).toHaveBeenCalledTimes(1);

			const body = googleApiRequestArgs[2] as {
				start: { dateTime: string };
				end: { dateTime: string };
			};

			expect(body).toBeDefined();
			expect(body.start.dateTime).not.toEqual('Invalid Date');
			expect(body.end.dateTime).not.toEqual('Invalid Date');
		});
	});
});
