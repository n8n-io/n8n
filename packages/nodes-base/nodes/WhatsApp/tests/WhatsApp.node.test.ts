import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';

const baseUrl = 'https://graph.facebook.com';
const credentials = { whatsAppApi: { accessToken: 'test-token', businessAccountId: '1234' } };

const workflow = (
	resource: string,
	operation: string,
	parameters: Record<string, string>,
): WorkflowTestData['input']['workflowData'] => ({
	nodes: [
		{
			id: '1',
			name: 'Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: '2',
			name: 'WhatsApp',
			type: 'n8n-nodes-base.whatsApp',
			typeVersion: 1.1,
			position: [200, 0],
			credentials: { whatsAppApi: { id: '1', name: 'WhatsApp' } },
			parameters: { resource, operation, ...parameters },
		},
	],
	connections: { Trigger: { main: [[{ node: 'WhatsApp', type: 'main', index: 0 }]] } },
});

describe('WhatsApp Business Cloud Node', () => {
	const harness = new NodeTestHarness();

	const cases: Array<{
		description: string;
		resource: string;
		operation: string;
		method: 'get' | 'post' | 'delete';
		parameters: Record<string, string>;
		path: string;
	}> = [
		{
			description: 'should get a media URL by ID',
			resource: 'media',
			operation: 'mediaUrlGet',
			method: 'get',
			parameters: { mediaGetId: '42' },
			path: '/v13.0/42',
		},
		{
			description: 'should send the media ID as one path segment when getting a media URL',
			resource: 'media',
			operation: 'mediaUrlGet',
			method: 'get',
			parameters: { mediaGetId: 'a/b' },
			path: '/v13.0/a%2Fb',
		},
		{
			description: 'should delete a media by ID',
			resource: 'media',
			operation: 'mediaDelete',
			method: 'delete',
			parameters: { mediaDeleteId: '42' },
			path: '/v13.0/42',
		},
		{
			description: 'should send the media ID as one path segment when deleting a media',
			resource: 'media',
			operation: 'mediaDelete',
			method: 'delete',
			parameters: { mediaDeleteId: 'a/b' },
			path: '/v13.0/a%2Fb',
		},
		{
			description: 'should send a message from a phone number ID',
			resource: 'message',
			operation: 'send',
			method: 'post',
			parameters: {
				phoneNumberId: '42',
				recipientPhoneNumber: '491701234567',
				messageType: 'text',
				textBody: 'Hello',
			},
			path: '/v13.0/42/messages',
		},
		{
			description: 'should send the phone number ID as one path segment when sending a message',
			resource: 'message',
			operation: 'send',
			method: 'post',
			parameters: {
				phoneNumberId: 'a/b',
				recipientPhoneNumber: '491701234567',
				messageType: 'text',
				textBody: 'Hello',
			},
			path: '/v13.0/a%2Fb/messages',
		},
	];

	for (const { description, resource, operation, method, parameters, path } of cases) {
		harness.setupTest({
			description,
			input: { workflowData: workflow(resource, operation, parameters) },
			output: { nodeData: { WhatsApp: [[{ json: { success: true } }]] } },
			credentials,
			nock: {
				baseUrl,
				mocks: [{ method, path, statusCode: 200, responseBody: { success: true } }],
			},
		});
	}

	for (const [resource, operation, parameter] of [
		['media', 'mediaUrlGet', 'mediaGetId'],
		['media', 'mediaDelete', 'mediaDeleteId'],
	]) {
		harness.setupTest({
			description: `should reject a dot segment as the media ID for ${operation}`,
			input: { workflowData: workflow(resource, operation, { [parameter]: '..' }) },
			output: { nodeData: {}, error: 'Invalid identifier: ".." is not allowed' },
			credentials,
		});
	}

	harness.setupTest({
		description: 'should reject a dot segment as the phone number ID',
		input: {
			workflowData: workflow('message', 'send', {
				phoneNumberId: '..',
				recipientPhoneNumber: '491701234567',
				messageType: 'text',
				textBody: 'Hello',
			}),
		},
		output: { nodeData: {}, error: 'Invalid identifier: ".." is not allowed' },
		credentials,
	});
});
