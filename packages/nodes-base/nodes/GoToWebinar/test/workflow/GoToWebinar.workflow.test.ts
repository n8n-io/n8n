import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const organizer = '/organizers/7023481655';
const webinar = `${organizer}/webinars/2913487560192837`;
const session = `${webinar}/sessions/3381229044`;

describe('GoToWebinar > Workflows', () => {
	const credentials = {
		goToWebinarOAuth2Api: {
			oauthTokenData: {
				access_token: 'fake-access-token',
				account_key: '5402918346',
				organizer_key: '7023481655',
			},
		},
	};

	beforeAll(() => {
		const api = nock('https://api.getgo.com/G2W/rest/v2');
		api.get(`${session}/attendees/5562039117`).reply(200, { firstName: 'Ada' });
		api.get(`${session}/attendees`).reply(200, [{ firstName: 'Ada' }]);
		api.get(`${session}/attendees/5562039117/polls`).reply(200, [{ question: 'Ready?' }]);

		api
			.post(`${webinar}/coorganizers`, [{ external: false, organizerKey: '8800112233' }])
			.reply(200, [{ memberKey: 'coorg-1' }]);
		api.delete(`${webinar}/coorganizers/4410020030`).query({ external: 'false' }).reply(200, {});
		api.get(`${webinar}/coorganizers`).reply(200, [{ memberKey: 'coorg-1' }]);
		api
			.post(`${webinar}/coorganizers/4410020030/resendInvitation`)
			.query({ external: 'false' })
			.reply(200, {});

		api
			.post(`${webinar}/panelists`, [{ name: 'Grace', email: 'grace@example.com' }])
			.reply(200, [{ panelistKey: 'panel-1' }]);
		api.delete(`${webinar}/panelists/6610020040`).reply(200, {});
		api.get(`${webinar}/panelists`).reply(200, [{ panelistKey: 'panel-1' }]);
		api.post(`${webinar}/panelists/6610020040/resendInvitation`).reply(200, {});

		api
			.post(`${webinar}/registrants`, {
				firstName: 'Ada',
				lastName: 'Lovelace',
				email: 'ada@example.com',
				responses: [],
			})
			.reply(200, { registrantKey: 'reg-1' });
		api.delete(`${webinar}/registrants/5562039117`).reply(200, {});
		api.get(`${webinar}/registrants/5562039117`).reply(200, { email: 'ada@example.com' });
		api.get(`${webinar}/registrants`).reply(200, [{ email: 'ada@example.com' }]);

		api.get(session).reply(200, { sessionKey: 'session-1' });
		api
			.get(`${organizer}/sessions`)
			.query(true)
			.reply(200, {
				_embedded: { sessionInfoResources: [{ sessionKey: 'session-2' }] },
				page: { totalElements: 1 },
			});
		api
			.get(`${webinar}/sessions`)
			.query(true)
			.reply(200, {
				_embedded: { sessionInfoResources: [{ sessionKey: 'session-3' }] },
				page: { totalElements: 1 },
			});
		api.get(`${session}/performance`).reply(200, { attendance: 'high' });

		api
			.post(`${organizer}/webinars`, {
				subject: 'Launch',
				times: [{ startTime: '2026-11-02T10:00:00Z', endTime: '2026-11-02T11:00:00Z' }],
			})
			.reply(200, { webinarKey: 'webinar-1' });
		api.delete(webinar).reply(200, {});
		api.get(webinar).reply(200, { subject: 'Launch' });
		api
			.get('/accounts/5402918346/webinars')
			.query(true)
			.reply(200, {
				_embedded: { webinars: [{ subject: 'Launch' }] },
				page: { totalElements: 1 },
			});
		api.put(webinar, { subject: 'Relaunch' }).query({ notifyParticipants: 'true' }).reply(200, {});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
