import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import accountDetails from './fixtures/account-details.json';
import accounts from './fixtures/accounts.json';
import opportunitiesSummary from './fixtures/opportunities-summary.json';
import opportunities from './fixtures/opportunities.json';
import opportunityDetails from './fixtures/opportunity-details.json';
import taskDetails from './fixtures/task-details.json';
import taskSummary from './fixtures/task-summary.json';
import tasks from './fixtures/tasks.json';
import userDetails from './fixtures/user-details.json';
import users from './fixtures/users.json';

describe('Salesforce Node', () => {
	const credentials = {
		salesforceOAuth2Api: {
			scope: 'full refresh_token',
			oauthTokenData: {
				access_token: 'ACCESSTOKEN',
				instance_url: 'https://salesforce.instance',
			},
		},
	};

	const salesforceNock = nock('https://salesforce.instance/services/data/v59.0');

	describe('users', () => {
		beforeAll(() => {
			salesforceNock
				.get('/query')
				.query({
					q: 'SELECT id,name,email FROM User ',
				})
				.reply(200, { records: users })
				.get('/sobjects/user/id1')
				.reply(200, userDetails);
		});

		afterAll(() => salesforceNock.done());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['users.workflow.json'],
		});
	});

	describe('tasks', () => {
		beforeAll(() => {
			salesforceNock
				.post('/sobjects/task', {
					Status: 'In Progress',
					Subject: 'Email',
					Description: 'Sample description',
				})
				.reply(200, { id: 'id1', success: true, errors: [] })
				.get('/query')
				.query({
					q: 'SELECT id,subject,status,priority FROM Task ',
				})
				.reply(200, { records: tasks })
				.get('/sobjects/task/id1')
				.reply(200, taskDetails)
				.get('/sobjects/task')
				.reply(200, taskSummary)
				.patch('/sobjects/task/id1', { Description: 'New description' })
				.reply(200, { success: true, errors: [] })
				.delete('/sobjects/task/id1')
				.reply(200, { success: true, errors: [] });
		});

		afterAll(() => salesforceNock.done());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['tasks.workflow.json'],
		});
	});

	describe('accounts', () => {
		beforeAll(() => {
			salesforceNock
				.post('/sobjects/account', { Name: 'Test Account' })
				.reply(200, { id: 'id1', success: true, errors: [] })
				.get('/query')
				.query({
					q: 'SELECT id,name,type FROM Account ',
				})
				.reply(200, { records: accounts })
				.post('/sobjects/note', { Title: 'New note', ParentId: 'id1' })
				.reply(200, {
					id: 'noteid1',
					success: true,
					errors: [],
				})
				.get('/sobjects/account/id1')
				.reply(200, accountDetails)
				.patch('/sobjects/account/id1', { Website: 'https://foo.bar.baz' })
				.reply(200, { success: true, errors: [] })
				.patch('/sobjects/account/Id/id1', { Name: 'New account' })
				.reply(200, { id: 'id1', created: false, success: true, errors: [] })
				.delete('/sobjects/account/id1')
				.reply(200, { success: true, errors: [] });
		});

		afterAll(() => salesforceNock.done());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['accounts.workflow.json'],
		});
	});

	describe('search', () => {
		beforeAll(() => {
			salesforceNock
				.get('/query')
				.query({
					q: 'SELECT id, name, type FROM Account',
				})
				.reply(200, { records: accounts });
		});

		afterAll(() => salesforceNock.done());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['search.workflow.json'],
		});
	});

	describe('opportunities', () => {
		beforeAll(() => {
			salesforceNock
				.post('/sobjects/opportunity', {
					Name: 'New Opportunity',
					CloseDate: '2025-01-01T00:00:00',
					StageName: 'Prospecting',
					Amount: 1000,
				})
				.reply(200, { id: 'id1', success: true, errors: [] })
				.get('/query')
				.query({
					q: 'SELECT id,accountId,amount,probability,type FROM Opportunity ',
				})
				.reply(200, { records: opportunities })
				.post('/sobjects/note', { Title: 'New Note', ParentId: 'id1' })
				.reply(200, {
					id: 'noteid1',
					success: true,
					errors: [],
				})
				.get('/sobjects/opportunity/id1')
				.reply(200, opportunityDetails)
				.patch('/sobjects/opportunity/id1', { Amount: 123 })
				.reply(200, { success: true, errors: [] })
				.patch('/sobjects/opportunity/Name/SomeName', {
					CloseDate: '2025-01-01T00:00:00',
					StageName: 'Prospecting',
				})
				.reply(200, { id: 'id1', created: false, success: true, errors: [] })
				.delete('/sobjects/opportunity/id1')
				.reply(200, { success: true, errors: [] })
				.get('/sobjects/opportunity')
				.reply(200, opportunitiesSummary);
		});

		afterAll(() => salesforceNock.done());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['opportunities.workflow.json'],
		});
	});

	describe('request URLs', () => {
		const leadId = '00Q5g00000A1b2CEAR';
		const contactId = '0035g00000B2c3DAAR';
		const caseId = '5005g00000C3d4EAAR';
		const attachmentId = '00P5g00000D4e5FAAR';
		const recordId = 'a005g00000F6g7HAAR';
		const created = { id: 'id1', success: true, errors: [] };

		beforeAll(() => {
			salesforceNock
				.post('/sobjects/lead')
				.reply(200, created)
				.patch('/sobjects/lead/Email/ada@example.com')
				.reply(200, created)
				.patch(`/sobjects/lead/${leadId}`)
				.reply(200, { success: true })
				.get(`/sobjects/lead/${leadId}`)
				.reply(200, { Id: leadId })
				.get('/query')
				.query(true)
				.reply(200, {
					records: [{ Id: leadId }],
					nextRecordsUrl: '/services/data/v59.0/query/01gD0000002HU6KIAW-2000',
				})
				.get('/query/01gD0000002HU6KIAW-2000')
				.query(true)
				.reply(200, { records: [{ Id: '00Q5g00000A1b2DEAR' }] })
				.delete(`/sobjects/lead/${leadId}`)
				.reply(204)
				.get('/sobjects/lead')
				.reply(200, { objectDescribe: { name: 'Lead' } })
				.post('/sobjects/CampaignMember')
				.times(2)
				.reply(200, created)
				.post('/sobjects/note')
				.times(2)
				.reply(200, created)
				.post('/sobjects/contact')
				.reply(200, created)
				.patch('/sobjects/contact/Email/grace@example.com')
				.reply(200, created)
				.patch(`/sobjects/contact/${contactId}`)
				.reply(200, { success: true })
				.get(`/sobjects/contact/${contactId}`)
				.reply(200, { Id: contactId })
				.delete(`/sobjects/contact/${contactId}`)
				.reply(204)
				.get('/sobjects/contact')
				.reply(200, { objectDescribe: { name: 'Contact' } })
				.post('/sobjects/Invoice__c')
				.reply(200, created)
				.patch('/sobjects/Invoice__c/External_Id__c/INV-1001')
				.reply(200, created)
				.patch(`/sobjects/Invoice__c/${recordId}`)
				.reply(200, { success: true })
				.get(`/sobjects/Invoice__c/${recordId}`)
				.reply(200, { Id: recordId })
				.delete(`/sobjects/Invoice__c/${recordId}`)
				.reply(204)
				.post('/sobjects/case')
				.reply(200, created)
				.patch(`/sobjects/case/${caseId}`)
				.reply(200, { success: true })
				.get(`/sobjects/case/${caseId}`)
				.reply(200, { Id: caseId })
				.delete(`/sobjects/case/${caseId}`)
				.reply(204)
				.get('/sobjects/case')
				.reply(200, { objectDescribe: { name: 'Case' } })
				.post('/sobjects/casecomment')
				.reply(200, created)
				.patch(`/sobjects/attachment/${attachmentId}`)
				.reply(200, { success: true })
				.get(`/sobjects/attachment/${attachmentId}`)
				.reply(200, { Id: attachmentId })
				.delete(`/sobjects/attachment/${attachmentId}`)
				.reply(204)
				.get('/sobjects/attachment')
				.reply(200, { objectDescribe: { name: 'Attachment' } })
				.post('/actions/custom/flow/Order_Sync_Flow')
				.reply(200, [{ isSuccess: true }])
				.get('/actions/custom/flow')
				.reply(200, { actions: [{ name: 'Order_Sync_Flow' }] });
		});

		afterAll(() => salesforceNock.done());

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['requests.workflow.json'],
		});
	});
});
