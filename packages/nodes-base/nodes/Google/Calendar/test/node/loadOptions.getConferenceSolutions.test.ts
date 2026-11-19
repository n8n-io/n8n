import { mock } from 'vitest-mock-extended';
import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { GoogleCalendar } from '../../GoogleCalendar.node';
import type * as _importType0 from '../../GenericFunctions';

vi.mock('../../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../../GenericFunctions')),
	googleApiRequest: vi.fn(),
}));

describe('Google Calendar Node > loadOptions > getConferenceSolutions', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it.each([
		[1.3, requestPath`/calendar/v3/users/me/calendarList/${'my/cal'}`],
		[1.4, requestPath`/calendar/v3/users/me/calendarList/${'my%2Fcal'}`],
	])('should request the calendar in node version %s', async (typeVersion, path) => {
		vi.mocked(genericFunctions.googleApiRequest).mockResolvedValue({
			conferenceProperties: { allowedConferenceSolutionTypes: ['hangoutsMeet'] },
		});
		const loadOptionsFunctions = mock<ILoadOptionsFunctions>({
			getNode: vi.fn().mockReturnValue(mock<INode>({ typeVersion })),
			getCurrentNodeParameter: vi.fn().mockReturnValue('my%2Fcal'),
		});

		const options = await new GoogleCalendar().methods.loadOptions.getConferenceSolutions.call(
			loadOptionsFunctions,
		);

		expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith('GET', path);
		expect(options).toEqual([{ name: 'Google Meet', value: 'hangoutsMeet' }]);
	});
});
