import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { IDataObject, WorkflowTestData } from 'n8n-workflow';
import nock from 'nock';

describe('Execute Twilio Node', () => {
	const testHarness = new NodeTestHarness();

	beforeEach(() => {
		nock.cleanAll();
	});

	const whatsappTestData: WorkflowTestData = {
		description: 'should send a WhatsApp template correctly',
		input: {
			workflowData: testHarness.readWorkflowJSON('workflow.json'),
		},
		output: {
			nodeData: {
				twilioTemplate: [[{ json: { sid: 'SM123', status: 'sent' } }]],
			},
		},
	};

	testHarness.setupTest(whatsappTestData, {
		credentials: { twilioApi: { accountSid: 'AC123' } },
		nock: {
			baseUrl: 'https://api.twilio.com/2010-04-01/Accounts',
			mocks: [
				{
					method: 'post',
					path: '/AC123/Messages.json',
					statusCode: 200,
					responseBody: { sid: 'SM123', status: 'sent' },
					requestBody: (body: IDataObject) => {
						return (
							body.To === 'whatsapp:+1234567890' &&
							body.From === 'whatsapp:+0987654321' &&
							body.ContentSid === 'HX1234567890' &&
							body.ContentVariables === '{"1":"John"}'
						);
					},
				},
			],
		},
	});

	const smsWorkflowData = testHarness.readWorkflowJSON('workflow.json');
	smsWorkflowData.nodes[0].parameters.toWhatsapp = false;
	smsWorkflowData.nodes[0].parameters.message = 'Hello';
	smsWorkflowData.nodes[0].parameters.options = { messagingServiceSid: 'MG123' };

	const smsTestData: WorkflowTestData = {
		description: 'should send an SMS with Messaging Service SID',
		input: { workflowData: smsWorkflowData },
		output: {
			nodeData: {
				twilioTemplate: [[{ json: { sid: 'SM456', status: 'sent' } }]],
			},
		},
	};

	testHarness.setupTest(smsTestData, {
		credentials: { twilioApi: { accountSid: 'AC123' } },
		nock: {
			baseUrl: 'https://api.twilio.com/2010-04-01/Accounts',
			mocks: [
				{
					method: 'post',
					path: '/AC123/Messages.json',
					statusCode: 200,
					responseBody: { sid: 'SM456', status: 'sent' },
					requestBody: (body: IDataObject) => {
						return (
							body.To === '+1234567890' &&
							body.MessagingServiceSid === 'MG123' &&
							body.Body === 'Hello'
						);
					},
				},
			],
		},
	});
});
