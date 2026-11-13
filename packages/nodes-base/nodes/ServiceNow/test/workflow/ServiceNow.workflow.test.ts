import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const attachmentId = 'a83820b58f723300e7e16c7827bdeed2';
const recordId = '9d385017c611228701d22104cc95c371';
const attachment = { sys_id: attachmentId, file_name: 'report.txt', content_type: 'text/plain' };
const record = { sys_id: recordId, number: 'INC0010001' };
const user = { sys_id: recordId, user_name: 'jane.doe' };

describe('ServiceNow > Workflows', () => {
	const credentials = {
		serviceNowBasicApi: {
			user: 'admin',
			password: 'fake-password',
			subdomain: 'dev12345',
		},
	};

	beforeAll(() => {
		const mock = nock('https://dev12345.service-now.com/api/now');
		mock.get(`/attachment/${attachmentId}`).reply(200, { result: attachment });
		mock.get(`/attachment/${attachmentId}/file`).reply(200, 'hello');
		mock
			.get('/attachment')
			.query({ sysparm_query: 'table_name=incident', sysparm_limit: 5 })
			.reply(200, { result: [attachment] });
		mock
			.post('/attachment/file')
			.query({ table_name: 'incident', table_sys_id: recordId, file_name: 'file.json' })
			.reply(201, { result: attachment });
		mock.delete(`/attachment/${attachmentId}`).reply(204);
		for (const table of [
			'cmdb_ci_service',
			'cmdb_ci',
			'cmn_department',
			'sys_dictionary',
			'sys_user_group',
			'sys_user_role',
		]) {
			mock
				.get(`/table/${table}`)
				.query({ sysparm_limit: 5 })
				.reply(200, { result: [record] });
		}
		mock
			.post('/table/incident', { short_description: 'Printer jam' })
			.reply(201, { result: record });
		mock.delete(`/table/incident/${recordId}`).reply(204);
		mock.get(`/table/incident/${recordId}`).reply(200, { result: record });
		mock
			.get('/table/incident')
			.query({ sysparm_limit: 5 })
			.reply(200, { result: [record] });
		mock.patch(`/table/incident/${recordId}`, { urgency: 2 }).reply(200, { result: record });
		mock.post('/table/u_vendor', { u_name: 'Acme Corp' }).reply(201, { result: record });
		mock.delete(`/table/u_vendor/${recordId}`).reply(204);
		mock.get(`/table/u_vendor/${recordId}`).reply(200, { result: record });
		mock
			.get('/table/u_vendor')
			.query({ sysparm_limit: 5 })
			.reply(200, { result: [record] });
		mock
			.patch(`/table/u_vendor/${recordId}`, { u_name: 'Acme Corp' })
			.reply(200, { result: record });
		mock.post('/table/sys_user', { user_name: 'jane.doe' }).reply(201, { result: user });
		mock.delete(`/table/sys_user/${recordId}`).reply(204);
		mock.get(`/table/sys_user/${recordId}`).reply(200, { result: user });
		mock
			.get('/table/sys_user')
			.query({ sysparm_query: 'user_name=jane.doe', sysparm_limit: 1 })
			.reply(200, { result: [user] });
		mock
			.get('/table/sys_user')
			.query({ sysparm_limit: 5 })
			.reply(200, { result: [user] });
		mock.patch(`/table/sys_user/${recordId}`, { first_name: 'Jane' }).reply(200, { result: user });
	});

	afterAll(() => expect(nock.isDone()).toBe(true));

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['requests.workflow.json'],
	});
});
