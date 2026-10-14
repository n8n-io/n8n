import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { mockDeep, mockReset } from 'vitest-mock-extended';

import { GoogleCalendar } from '../GoogleCalendar.node';

describe('GoogleCalendar', () => {
	const node = new GoogleCalendar();
	const loadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
	const calendar = {
		kind: 'calendar#calendarListEntry',
		id: 'test-calendar',
		summary: 'Test calendar',
	};

	beforeEach(() => {
		mockReset(loadOptionsFunctions);
		loadOptionsFunctions.getCurrentNodeParameter.mockReturnValue(calendar.id);
	});

	describe('loadOptions.getConferenceSolutions', () => {
		it('should return the supported conference solutions', async () => {
			loadOptionsFunctions.helpers.requestOAuth2.mockResolvedValueOnce({
				...calendar,
				conferenceProperties: {
					allowedConferenceSolutionTypes: ['hangoutsMeet'],
				},
			});

			await expect(
				node.methods.loadOptions.getConferenceSolutions.call(loadOptionsFunctions),
			).resolves.toEqual([{ name: 'Google Meet', value: 'hangoutsMeet' }]);
			expect(loadOptionsFunctions.getCurrentNodeParameter).toHaveBeenCalledWith('calendar', {
				extractValue: true,
			});
			expect(loadOptionsFunctions.helpers.requestOAuth2).toHaveBeenCalledWith(
				'googleCalendarOAuth2Api',
				expect.objectContaining({
					method: 'GET',
					uri: `https://www.googleapis.com/calendar/v3/users/me/calendarList/${calendar.id}`,
				}),
			);
		});

		it('should return no conference solutions when conferenceProperties is absent', async () => {
			// NODE-5907: Google omits conferenceProperties for calendars without conferencing support.
			loadOptionsFunctions.helpers.requestOAuth2.mockResolvedValueOnce(calendar);

			await expect(
				node.methods.loadOptions.getConferenceSolutions.call(loadOptionsFunctions),
			).resolves.toEqual([]);
		});
	});
});
