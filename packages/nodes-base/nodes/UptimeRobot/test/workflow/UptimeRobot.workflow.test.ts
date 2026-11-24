import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const monitor = { id: 777749809, status: 1 };
const contact = { id: '0993765', status: 2 };
const mwindow = { id: 581, status: 1 };
const psp = { id: 2345678, standard_url: 'https://stats.uptimerobot.com/abc' };

const responses: Array<[string, object]> = [
	['/getAccountDetails', { account: { email: 'nathan@example.com' } }],
	['/newMonitor', { monitor }],
	['/deleteMonitor', { monitor }],
	['/getMonitors', { monitors: [monitor] }],
	['/getMonitors', { monitors: [monitor] }],
	['/resetMonitor', { monitor }],
	['/editMonitor', { monitor }],
	['/newAlertContact', { alertcontact: contact }],
	['/deleteAlertContact', { alert_contact: contact }],
	['/getAlertContacts', { alert_contacts: [contact] }],
	['/getAlertContacts', { alert_contacts: [contact] }],
	['/editAlertContact', { alert_contact: contact }],
	['/newMWindow', { mwindow }],
	['/deleteMWindow', { message: 'Deleted' }],
	['/getMWindows', { mwindows: [mwindow] }],
	['/getMWindows', { mwindows: [mwindow] }],
	['/editMWindow', { mwindow }],
	['/newPSP', { psp }],
	['/deletePSP', { psp }],
	['/getPSPs', { psps: [psp] }],
	['/getPSPs', { psps: [psp] }],
];

describe('Uptime Robot > Workflows', () => {
	const credentials = { uptimeRobotApi: { apiKey: 'fake-api-key' } };
	const mock = nock('https://api.uptimerobot.com/v2');

	beforeAll(() => {
		for (const [path, response] of responses) {
			mock
				.post(path, (body: Record<string, string>) => body.api_key === 'fake-api-key')
				.reply(200, { stat: 'ok', ...response });
		}
	});

	new NodeTestHarness().setupTests({
		credentials,
		customAssertions: () => expect(mock.pendingMocks()).toEqual([]),
	});
});
