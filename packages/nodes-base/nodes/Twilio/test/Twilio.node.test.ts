import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';
import nock from 'nock';

describe('Execute Twilio Node', () => {
	const testHarness = new NodeTestHarness();

	beforeEach(() => {
		nock('https://api.twilio.com/2010-04-01/Accounts')
			.post(/.*\/Messages.json/)
			.reply(200, {
				sid: 'SM...',
				status: 'sent',
			});
	});

	const testData: WorkflowTestData = {
		description: 'Send Twilio WhatsApp Template',
		input: {
			workflowData: testHarness.readWorkflowJSON('workflow.json'),
		},
		output: {
			nodeData: {
				twilioTemplate: [[{ json: { sid: 'SM...', status: 'sent' } }]],
			},
		},
	};

	testHarness.setupTest(testData, { credentials: { twilioApi: {} } });
});
