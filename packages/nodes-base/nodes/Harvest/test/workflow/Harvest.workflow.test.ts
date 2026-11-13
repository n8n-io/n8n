import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Harvest > Workflows', () => {
	const credentials = {
		harvestApi: {
			accessToken: 'fake-access-token',
		},
	};

	beforeAll(() => {
		const api = nock('https://api.harvestapp.com/v2')
			.matchHeader('harvest-account-id', '1234567')
			.matchHeader('authorization', 'Bearer fake-access-token');
		api.get('/time_entries/636709355').reply(200, { id: 636709355, resource: 'time_entries' });
		api
			.get('/time_entries')
			.query({ per_page: 2 })
			.reply(200, { time_entries: [{ id: 636709355, resource: 'time_entries' }] });
		api
			.get('/time_entries')
			.query({ per_page: 100 })
			.reply(200, { time_entries: [{ id: 636709355, resource: 'time_entries' }], next_page: 2 });
		api
			.get('/time_entries')
			.query({ per_page: 100, page: 2 })
			.reply(200, { time_entries: [{ id: 636709356 }], next_page: null });
		api.post('/time_entries').reply(200, { id: 636709355, resource: 'time_entries' });
		api.post('/time_entries').reply(200, { id: 636709355, resource: 'time_entries' });
		api
			.delete('/time_entries/636709355/external_reference')
			.reply(200, { id: 636709355, resource: 'time_entries' });
		api
			.patch('/time_entries/636709355/restart')
			.reply(200, { id: 636709355, resource: 'time_entries' });
		api
			.patch('/time_entries/636709355/stop')
			.reply(200, { id: 636709355, resource: 'time_entries' });
		api.patch('/time_entries/636709355').reply(200, { id: 636709355, resource: 'time_entries' });
		api.delete('/time_entries/636709355').reply(200, { id: 636709355, resource: 'time_entries' });
		api.get('/clients/5735776').reply(200, { id: 5735776, resource: 'clients' });
		api
			.get('/clients')
			.query({ per_page: 2 })
			.reply(200, { clients: [{ id: 5735776, resource: 'clients' }] });
		api
			.get('/clients')
			.query({ per_page: 100 })
			.reply(200, { clients: [{ id: 5735776, resource: 'clients' }], next_page: 2 });
		api
			.get('/clients')
			.query({ per_page: 100, page: 2 })
			.reply(200, { clients: [{ id: 5735777 }], next_page: null });
		api.post('/clients').reply(200, { id: 5735776, resource: 'clients' });
		api.patch('/clients/5735776').reply(200, { id: 5735776, resource: 'clients' });
		api.delete('/clients/5735776').reply(200, { id: 5735776, resource: 'clients' });
		api.get('/projects/14308069').reply(200, { id: 14308069, resource: 'projects' });
		api
			.get('/projects')
			.query({ per_page: 2 })
			.reply(200, { projects: [{ id: 14308069, resource: 'projects' }] });
		api
			.get('/projects')
			.query({ per_page: 100 })
			.reply(200, { projects: [{ id: 14308069, resource: 'projects' }], next_page: 2 });
		api
			.get('/projects')
			.query({ per_page: 100, page: 2 })
			.reply(200, { projects: [{ id: 14308070 }], next_page: null });
		api.post('/projects').reply(200, { id: 14308069, resource: 'projects' });
		api.patch('/projects/14308069').reply(200, { id: 14308069, resource: 'projects' });
		api.delete('/projects/14308069').reply(200, { id: 14308069, resource: 'projects' });
		api.get('/users/1782959').reply(200, { id: 1782959, resource: 'users' });
		api
			.get('/users')
			.query({ per_page: 2 })
			.reply(200, { users: [{ id: 1782959, resource: 'users' }] });
		api
			.get('/users')
			.query({ per_page: 100 })
			.reply(200, { users: [{ id: 1782959, resource: 'users' }], next_page: 2 });
		api
			.get('/users')
			.query({ per_page: 100, page: 2 })
			.reply(200, { users: [{ id: 1782960 }], next_page: null });
		api.post('/users').reply(200, { id: 1782959, resource: 'users' });
		api.patch('/users/1782959').reply(200, { id: 1782959, resource: 'users' });
		api.delete('/users/1782959').reply(200, { id: 1782959, resource: 'users' });
		api.get('/contacts/4706479').reply(200, { id: 4706479, resource: 'contacts' });
		api
			.get('/contacts')
			.query({ per_page: 2 })
			.reply(200, { contacts: [{ id: 4706479, resource: 'contacts' }] });
		api
			.get('/contacts')
			.query({ per_page: 100 })
			.reply(200, { contacts: [{ id: 4706479, resource: 'contacts' }], next_page: 2 });
		api
			.get('/contacts')
			.query({ per_page: 100, page: 2 })
			.reply(200, { contacts: [{ id: 4706480 }], next_page: null });
		api.post('/contacts').reply(200, { id: 4706479, resource: 'contacts' });
		api.patch('/contacts/4706479').reply(200, { id: 4706479, resource: 'contacts' });
		api.delete('/contacts/4706479').reply(200, { id: 4706479, resource: 'contacts' });
		api.get('/tasks/8083365').reply(200, { id: 8083365, resource: 'tasks' });
		api
			.get('/tasks')
			.query({ per_page: 2 })
			.reply(200, { tasks: [{ id: 8083365, resource: 'tasks' }] });
		api
			.get('/tasks')
			.query({ per_page: 100 })
			.reply(200, { tasks: [{ id: 8083365, resource: 'tasks' }], next_page: 2 });
		api
			.get('/tasks')
			.query({ per_page: 100, page: 2 })
			.reply(200, { tasks: [{ id: 8083366 }], next_page: null });
		api.post('/tasks').reply(200, { id: 8083365, resource: 'tasks' });
		api.patch('/tasks/8083365').reply(200, { id: 8083365, resource: 'tasks' });
		api.delete('/tasks/8083365').reply(200, { id: 8083365, resource: 'tasks' });
		api.get('/invoices/13150403').reply(200, { id: 13150403, resource: 'invoices' });
		api
			.get('/invoices')
			.query({ per_page: 2 })
			.reply(200, { invoices: [{ id: 13150403, resource: 'invoices' }] });
		api
			.get('/invoices')
			.query({ per_page: 100 })
			.reply(200, { invoices: [{ id: 13150403, resource: 'invoices' }], next_page: 2 });
		api
			.get('/invoices')
			.query({ per_page: 100, page: 2 })
			.reply(200, { invoices: [{ id: 13150404 }], next_page: null });
		api.post('/invoices').reply(200, { id: 13150403, resource: 'invoices' });
		api.patch('/invoices/13150403').reply(200, { id: 13150403, resource: 'invoices' });
		api.delete('/invoices/13150403').reply(200, { id: 13150403, resource: 'invoices' });
		api.get('/expenses/15296442').reply(200, { id: 15296442, resource: 'expenses' });
		api
			.get('/expenses')
			.query({ per_page: 2 })
			.reply(200, { expenses: [{ id: 15296442, resource: 'expenses' }] });
		api
			.get('/expenses')
			.query({ per_page: 100 })
			.reply(200, { expenses: [{ id: 15296442, resource: 'expenses' }], next_page: 2 });
		api
			.get('/expenses')
			.query({ per_page: 100, page: 2 })
			.reply(200, { expenses: [{ id: 15296443 }], next_page: null });
		api.post('/expenses').reply(200, { id: 15296442, resource: 'expenses' });
		api.patch('/expenses/15296442').reply(200, { id: 15296442, resource: 'expenses' });
		api.delete('/expenses/15296442').reply(200, { id: 15296442, resource: 'expenses' });
		api.get('/estimates/1439818').reply(200, { id: 1439818, resource: 'estimates' });
		api
			.get('/estimates')
			.query({ per_page: 2 })
			.reply(200, { estimates: [{ id: 1439818, resource: 'estimates' }] });
		api
			.get('/estimates')
			.query({ per_page: 100 })
			.reply(200, { estimates: [{ id: 1439818, resource: 'estimates' }], next_page: 2 });
		api
			.get('/estimates')
			.query({ per_page: 100, page: 2 })
			.reply(200, { estimates: [{ id: 1439819 }], next_page: null });
		api.post('/estimates').reply(200, { id: 1439818, resource: 'estimates' });
		api.patch('/estimates/1439818').reply(200, { id: 1439818, resource: 'estimates' });
		api.delete('/estimates/1439818').reply(200, { id: 1439818, resource: 'estimates' });
		api.get('/users/me').reply(200, { id: 1782959 });
		api.get('/company').reply(200, { name: 'Acme Corp' });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
