import nock from 'nock';

import { testPollingTriggerNode } from '@test/nodes/TriggerHelpers';

import { TogglTrigger } from '../TogglTrigger.node';

describe('TogglTrigger', () => {
	it('should request new time entries from the Toggl API', async () => {
		const timeEntry = { id: 3507285114, description: 'Planning' };
		nock('https://api.track.toggl.com')
			.get('/api/v9/me/time_entries')
			.query((query) => query.start_date === '2025-03-01' && typeof query.end_date === 'string')
			.reply(200, [timeEntry]);

		const { response } = await testPollingTriggerNode(TogglTrigger, {
			mode: 'manual',
			node: { parameters: { event: 'newTimeEntry' } },
			workflowStaticData: { lastTimeChecked: '2025-03-01' },
		});

		expect(response).toEqual([[{ json: timeEntry }]]);
		expect(nock.pendingMocks()).toEqual([]);
	});
});
