import { mock } from 'jest-mock-extended';
import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { GoogleCalendar } from '../../GoogleCalendar.node';
import type * as GenericFunctions from '../../GenericFunctions';

jest.mock('../../GenericFunctions', () => ({
	...jest.requireActual<typeof GenericFunctions>('../../GenericFunctions'),
	googleApiRequest: jest.fn(),
}));

describe('Google Calendar Node > loadOptions > getConferenceSolutions', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	it.each([
		[1.3, requestPath`/calendar/v3/users/me/calendarList/${'my/cal'}`],
		[1.4, requestPath`/calendar/v3/users/me/calendarList/${'my%2Fcal'}`],
	])('should request the calendar in node version %s', async (typeVersion, path) => {
		jest.mocked(genericFunctions.googleApiRequest).mockResolvedValue({
			conferenceProperties: { allowedConferenceSolutionTypes: ['hangoutsMeet'] },
		});
		const loadOptionsFunctions = mock<ILoadOptionsFunctions>({
			getNode: jest.fn().mockReturnValue(mock<INode>({ typeVersion })),
			getCurrentNodeParameter: jest.fn().mockReturnValue('my%2Fcal'),
		});

		const options = await new GoogleCalendar().methods.loadOptions.getConferenceSolutions.call(
			loadOptionsFunctions,
		);

		expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith('GET', path);
		expect(options).toEqual([{ name: 'Google Meet', value: 'hangoutsMeet' }]);
	});
});
