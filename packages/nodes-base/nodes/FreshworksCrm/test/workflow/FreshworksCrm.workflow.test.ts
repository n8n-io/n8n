import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	freshworksCrmApi: {
		apiKey: 'fake-api-key',
		domain: 'acme',
	},
};

describe('Freshworks CRM > Request URLs', () => {
	beforeAll(() => {
		const mock = nock('https://acme.myfreshworks.com/crm/sales/api');
		mock
			.post('/sales_accounts')
			.reply(200, { sales_account: { id: 70001234567, name: 'account 70001234567' } });
		mock.delete('/sales_accounts/70001234567').reply(204);
		mock
			.get('/sales_accounts/70001234567')
			.reply(200, { sales_account: { id: 70001234567, name: 'account 70001234567' } });
		mock
			.get('/sales_accounts/view/70000123')
			.query(true)
			.reply(200, {
				sales_accounts: [{ id: 70001234567, name: 'account 70001234567' }],
				meta: { total_pages: 1 },
			});
		mock
			.put('/sales_accounts/70001234567')
			.reply(200, { sales_account: { id: 70001234567, name: 'account 70001234567' } });
		mock
			.post('/appointments')
			.reply(200, { appointment: { id: 70002233445, name: 'appointment 70002233445' } });
		mock.delete('/appointments/70002233445').reply(204);
		mock
			.get('/appointments/70002233445')
			.reply(200, { appointment: { id: 70002233445, name: 'appointment 70002233445' } });
		mock
			.get('/appointments')
			.query(true)
			.reply(200, {
				appointments: [{ id: 70002233445, name: 'appointment 70002233445' }],
				meta: { total_pages: 1 },
			});
		mock
			.put('/appointments/70002233445')
			.reply(200, { appointment: { id: 70002233445, name: 'appointment 70002233445' } });
		mock
			.post('/contacts')
			.reply(200, { contact: { id: 70003344556, name: 'contact 70003344556' } });
		mock.delete('/contacts/70003344556').reply(204);
		mock
			.get('/contacts/70003344556')
			.reply(200, { contact: { id: 70003344556, name: 'contact 70003344556' } });
		mock
			.get('/contacts/view/70000456')
			.query(true)
			.reply(200, {
				contacts: [{ id: 70003344556, name: 'contact 70003344556' }],
				meta: { total_pages: 1 },
			});
		mock
			.put('/contacts/70003344556')
			.reply(200, { contact: { id: 70003344556, name: 'contact 70003344556' } });
		mock.post('/deals').reply(200, { deal: { id: 70004455667, name: 'deal 70004455667' } });
		mock.delete('/deals/70004455667').reply(204);
		mock
			.get('/deals/70004455667')
			.reply(200, { deal: { id: 70004455667, name: 'deal 70004455667' } });
		mock
			.get('/deals/view/70000789')
			.query(true)
			.reply(200, {
				deals: [{ id: 70004455667, name: 'deal 70004455667' }],
				meta: { total_pages: 1 },
			});
		mock
			.put('/deals/70004455667')
			.reply(200, { deal: { id: 70004455667, name: 'deal 70004455667' } });
		mock.post('/notes').reply(200, { note: { id: 70005566778, name: 'note 70005566778' } });
		mock.delete('/notes/70005566778').reply(204);
		mock
			.put('/notes/70005566778')
			.reply(200, { note: { id: 70005566778, name: 'note 70005566778' } });
		mock
			.post('/sales_activities')
			.reply(200, { sales_activity: { id: 70006677889, name: 'salesActivity 70006677889' } });
		mock.delete('/sales_activities/70006677889').reply(204);
		mock
			.get('/sales_activities/70006677889')
			.reply(200, { sales_activity: { id: 70006677889, name: 'salesActivity 70006677889' } });
		mock
			.get('/sales_activities')
			.query(true)
			.reply(200, {
				sales_activities: [{ id: 70006677889, name: 'salesActivity 70006677889' }],
				meta: { total_pages: 1 },
			});
		mock
			.put('/sales_activities/70006677889')
			.reply(200, { sales_activity: { id: 70006677889, name: 'salesActivity 70006677889' } });
		mock.post('/tasks').reply(200, { task: { id: 70007788990, name: 'task 70007788990' } });
		mock.delete('/tasks/70007788990').reply(204);
		mock
			.get('/tasks/70007788990')
			.reply(200, { task: { id: 70007788990, name: 'task 70007788990' } });
		mock
			.get('/tasks')
			.query(true)
			.reply(200, {
				tasks: [{ id: 70007788990, name: 'task 70007788990' }],
				meta: { total_pages: 1 },
			});
		mock
			.put('/tasks/70007788990')
			.reply(200, { task: { id: 70007788990, name: 'task 70007788990' } });
		mock
			.get('/search')
			.query(true)
			.reply(200, [{ id: 70003344556, name: 'Nathan Smith' }]);
		mock
			.get('/lookup')
			.query(true)
			.reply(200, { contacts: { contacts: [{ id: 70003344556 }] } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
