import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const done = { message: 'Done' };

describe('Misp > Workflows', () => {
	const credentials = {
		mispApi: {
			apiKey: 'fake-api-key',
			baseUrl: 'https://misp.example.com',
			allowUnauthorizedCerts: false,
		},
	};

	beforeAll(() => {
		const mock = nock('https://misp.example.com');
		mock
			.post('/attributes/add/12', { type: 'ip-src', value: '8.8.8.8' })
			.reply(200, { Attribute: { id: '34' } });
		mock.delete('/attributes/delete/34').reply(200, done);
		mock.get('/attributes/view/34').reply(200, { Attribute: { id: '34' } });
		mock.get('/attributes').reply(200, [{ id: '34' }]);
		mock
			.post('/attributes/restSearch', { value: '8.8.8.8' })
			.reply(200, { response: { Attribute: [{ id: '34' }] } });
		mock.put('/attributes/edit/34', { distribution: 0 }).reply(200, { Attribute: { id: '34' } });
		mock.delete('/events/delete/12').reply(200, done);
		mock.get('/events/view/12').reply(200, { Event: { id: '12', Attribute: [] } });
		mock.post('/events/publish/12').reply(200, done);
		mock.post('/events/unpublish/12').reply(200, done);
		mock
			.put('/events/edit/12', { information: 'Phishing' })
			.reply(200, { Event: { id: '12', Attribute: [] } });
		mock.post('/events/removeTag/12/7').reply(200, done);
		mock.post('/feeds/disable/3').reply(200, done);
		mock.post('/feeds/enable/3').reply(200, done);
		mock.get('/feeds/view/3').reply(200, { Feed: { id: '3' } });
		mock.put('/feeds/edit/3', { name: 'Acme Feed' }).reply(200, { Feed: { id: '3' } });
		mock.delete('/galaxies/delete/5').reply(200, done);
		mock.get('/galaxies/view/5').reply(200, { Galaxy: { id: '5' } });
		mock.get('/noticelists/view/2').reply(200, { Noticelist: { id: '2' } });
		mock.delete('/admin/organisations/delete/1').reply(200, done);
		mock.get('/organisations/view/1').reply(200, { Organisation: { id: '1' } });
		mock
			.put('/admin/organisations/edit/1', { name: 'Acme Corp' })
			.reply(200, { Organisation: { id: '1' } });
		mock.post('/tags/delete/7').reply(200, done);
		mock.post('/tags/edit/7', { name: 'tlp:white' }).reply(200, { Tag: { id: '7' } });
		mock.delete('/admin/users/delete/9').reply(200, done);
		mock.get('/admin/users/view/9').reply(200, { User: { id: '9' } });
		mock
			.put('/admin/users/edit/9', { email: 'nathan@example.com' })
			.reply(200, { User: { id: '9' } });
		mock.get('/warninglists/view/4').reply(200, { Warninglist: { id: '4' } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
