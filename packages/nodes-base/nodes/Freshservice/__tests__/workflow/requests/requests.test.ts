import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const credentials = {
	freshserviceApi: {
		apiKey: 'fake-api-key',
		domain: 'n8n-test',
	},
};

describe('Freshservice > Request URLs', () => {
	beforeAll(() => {
		const mock = nock('https://n8n-test.freshservice.com/api/v2');
		mock.post('/agents').reply(200, { agent: { id: 21001397559, name: 'agent 21001397559' } });
		mock.delete('/agents/21001397559').reply(204);
		mock
			.get('/agents/21001397559')
			.reply(200, { agent: { id: 21001397559, name: 'agent 21001397559' } });
		mock
			.get('/agents')
			.query(true)
			.reply(200, { agents: [{ id: 21001397559, name: 'agent 21001397559' }] });
		mock
			.put('/agents/21001397559')
			.reply(200, { agent: { id: 21001397559, name: 'agent 21001397559' } });
		mock.post('/groups').reply(200, { group: { id: 21000187001, name: 'agentGroup 21000187001' } });
		mock.delete('/groups/21000187001').reply(204);
		mock
			.get('/groups/21000187001')
			.reply(200, { group: { id: 21000187001, name: 'agentGroup 21000187001' } });
		mock
			.get('/groups')
			.query(true)
			.reply(200, { groups: [{ id: 21000187001, name: 'agentGroup 21000187001' }] });
		mock
			.put('/groups/21000187001')
			.reply(200, { group: { id: 21000187001, name: 'agentGroup 21000187001' } });
		mock
			.get('/roles/21000204000')
			.reply(200, { role: { id: 21000204000, name: 'agentRole 21000204000' } });
		mock
			.get('/roles')
			.query(true)
			.reply(200, { roles: [{ id: 21000204000, name: 'agentRole 21000204000' }] });
		mock
			.post('/announcements')
			.reply(200, { announcement: { id: 21000012345, name: 'announcement 21000012345' } });
		mock.delete('/announcements/21000012345').reply(204);
		mock
			.get('/announcements/21000012345')
			.reply(200, { announcement: { id: 21000012345, name: 'announcement 21000012345' } });
		mock
			.get('/announcements')
			.query(true)
			.reply(200, { announcements: [{ id: 21000012345, name: 'announcement 21000012345' }] });
		mock
			.put('/announcements/21000012345')
			.reply(200, { announcement: { id: 21000012345, name: 'announcement 21000012345' } });
		mock
			.post('/asset_types')
			.reply(200, { asset_type: { id: 21000533000, name: 'assetType 21000533000' } });
		mock.delete('/asset_types/21000533000').reply(204);
		mock
			.get('/asset_types/21000533000')
			.reply(200, { asset_type: { id: 21000533000, name: 'assetType 21000533000' } });
		mock
			.get('/asset_types')
			.query(true)
			.reply(200, { asset_types: [{ id: 21000533000, name: 'assetType 21000533000' }] });
		mock
			.put('/asset_types/21000533000')
			.reply(200, { asset_type: { id: 21000533000, name: 'assetType 21000533000' } });
		mock.post('/changes').reply(200, { change: { id: 15, name: 'change 15' } });
		mock.delete('/changes/15').reply(204);
		mock.get('/changes/15').reply(200, { change: { id: 15, name: 'change 15' } });
		mock
			.get('/changes')
			.query(true)
			.reply(200, { changes: [{ id: 15, name: 'change 15' }] });
		mock.put('/changes/15').reply(200, { change: { id: 15, name: 'change 15' } });
		mock
			.post('/departments')
			.reply(200, { department: { id: 21000098000, name: 'department 21000098000' } });
		mock.delete('/departments/21000098000').reply(204);
		mock
			.get('/departments/21000098000')
			.reply(200, { department: { id: 21000098000, name: 'department 21000098000' } });
		mock
			.get('/departments')
			.query(true)
			.reply(200, { departments: [{ id: 21000098000, name: 'department 21000098000' }] });
		mock
			.put('/departments/21000098000')
			.reply(200, { department: { id: 21000098000, name: 'department 21000098000' } });
		mock
			.post('/locations')
			.reply(200, { location: { id: 21000045000, name: 'location 21000045000' } });
		mock.delete('/locations/21000045000').reply(204);
		mock
			.get('/locations/21000045000')
			.reply(200, { location: { id: 21000045000, name: 'location 21000045000' } });
		mock
			.get('/locations')
			.query(true)
			.reply(200, { locations: [{ id: 21000045000, name: 'location 21000045000' }] });
		mock
			.put('/locations/21000045000')
			.reply(200, { location: { id: 21000045000, name: 'location 21000045000' } });
		mock.post('/problems').reply(200, { problem: { id: 7, name: 'problem 7' } });
		mock.delete('/problems/7').reply(204);
		mock.get('/problems/7').reply(200, { problem: { id: 7, name: 'problem 7' } });
		mock
			.get('/problems')
			.query(true)
			.reply(200, { problems: [{ id: 7, name: 'problem 7' }] });
		mock.put('/problems/7').reply(200, { problem: { id: 7, name: 'problem 7' } });
		mock
			.post('/products')
			.reply(200, { product: { id: 21000033000, name: 'product 21000033000' } });
		mock.delete('/products/21000033000').reply(204);
		mock
			.get('/products/21000033000')
			.reply(200, { product: { id: 21000033000, name: 'product 21000033000' } });
		mock
			.get('/products')
			.query(true)
			.reply(200, { products: [{ id: 21000033000, name: 'product 21000033000' }] });
		mock
			.put('/products/21000033000')
			.reply(200, { product: { id: 21000033000, name: 'product 21000033000' } });
		mock.post('/releases').reply(200, { release: { id: 3, name: 'release 3' } });
		mock.delete('/releases/3').reply(204);
		mock.get('/releases/3').reply(200, { release: { id: 3, name: 'release 3' } });
		mock
			.get('/releases')
			.query(true)
			.reply(200, { releases: [{ id: 3, name: 'release 3' }] });
		mock.put('/releases/3').reply(200, { release: { id: 3, name: 'release 3' } });
		mock
			.post('/requesters')
			.reply(200, { requester: { id: 21001931696, name: 'requester 21001931696' } });
		mock.delete('/requesters/21001931696').reply(204);
		mock
			.get('/requesters/21001931696')
			.reply(200, { requester: { id: 21001931696, name: 'requester 21001931696' } });
		mock
			.get('/requesters')
			.query(true)
			.reply(200, { requesters: [{ id: 21001931696, name: 'requester 21001931696' }] });
		mock
			.put('/requesters/21001931696')
			.reply(200, { requester: { id: 21001931696, name: 'requester 21001931696' } });
		mock
			.post('/requester_groups')
			.reply(200, { requester_group: { id: 21000011000, name: 'requesterGroup 21000011000' } });
		mock.delete('/requester_groups/21000011000').reply(204);
		mock
			.get('/requester_groups/21000011000')
			.reply(200, { requester_group: { id: 21000011000, name: 'requesterGroup 21000011000' } });
		mock
			.get('/requester_groups')
			.query(true)
			.reply(200, { requester_groups: [{ id: 21000011000, name: 'requesterGroup 21000011000' }] });
		mock
			.put('/requester_groups/21000011000')
			.reply(200, { requester_group: { id: 21000011000, name: 'requesterGroup 21000011000' } });
		mock
			.post('/applications')
			.reply(200, { application: { id: 21000077000, name: 'software 21000077000' } });
		mock.delete('/applications/21000077000').reply(204);
		mock
			.get('/applications/21000077000')
			.reply(200, { application: { id: 21000077000, name: 'software 21000077000' } });
		mock
			.get('/applications')
			.query(true)
			.reply(200, { applications: [{ id: 21000077000, name: 'software 21000077000' }] });
		mock
			.put('/applications/21000077000')
			.reply(200, { application: { id: 21000077000, name: 'software 21000077000' } });
		mock.post('/tickets').reply(200, { ticket: { id: 42, name: 'ticket 42' } });
		mock.delete('/tickets/42').reply(204);
		mock.get('/tickets/42').reply(200, { ticket: { id: 42, name: 'ticket 42' } });
		mock
			.get('/tickets')
			.query(true)
			.reply(200, { tickets: [{ id: 42, name: 'ticket 42' }] });
		mock.put('/tickets/42').reply(200, { ticket: { id: 42, name: 'ticket 42' } });
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
		customAssertions: () => expect(nock.isDone()).toBe(true),
	});
});
