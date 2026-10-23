import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { IDataObject, INodeParameters, WorkflowTestData } from 'n8n-workflow';
import nock from 'nock';

const cleanupUserFolder = await vi.hoisted(async () => {
	const { mkdtempSync, rmSync } = await import('node:fs');
	const { tmpdir } = await import('node:os');
	const { join } = await import('node:path');
	const userFolder = mkdtempSync(join(tmpdir(), 'n8n-highlevel-contact-update-'));
	vi.stubEnv('N8N_USER_FOLDER', userFolder);

	return () => {
		vi.unstubAllEnvs();
		rmSync(userFolder, { recursive: true, force: true });
	};
});

const workflow = (updateFields: INodeParameters): WorkflowTestData['input']['workflowData'] => ({
	nodes: [
		{
			id: 'trigger',
			name: 'Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: 'highlevel',
			name: 'Update a contact',
			type: 'n8n-nodes-base.highLevel',
			typeVersion: 2,
			position: [200, 0],
			credentials: { highLevelOAuth2Api: { id: 'credential-1', name: 'HighLevel' } },
			parameters: {
				resource: 'contact',
				operation: 'update',
				contactId: 'contact-1',
				updateFields,
				requestOptions: {},
			},
		},
	],
	connections: { Trigger: { main: [[{ node: 'Update a contact', type: 'main', index: 0 }]] } },
});

describe('HighLevel v2 contact update', () => {
	const harness = new NodeTestHarness();
	const credentials = {
		highLevelOAuth2Api: {
			oauthTokenData: { access_token: 'test-token' },
		},
	};
	let requestBody: unknown;

	beforeEach(() => {
		requestBody = undefined;
		nock('https://services.leadconnectorhq.com')
			.put('/contacts/contact-1/')
			.matchHeader('Version', '2021-07-28')
			.matchHeader('Content-Type', 'application/json')
			.reply(200, (_uri, body) => {
				requestBody = body;
				return { contact: { id: 'contact-1' } };
			});
	});

	afterEach(() => nock.cleanAll());
	afterAll(cleanupUserFolder);

	const cases: Array<{
		description: string;
		updateFields: INodeParameters;
		expectedBody: IDataObject;
	}> = [
		{
			description: 'should update a standard contact field',
			updateFields: { firstName: 'Alex' },
			expectedBody: { firstName: 'Alex' },
		},
		// NODE-5644: Assert the payload from the working HTTP Request workaround.
		...[
			{ fieldId: 'summary-field', fieldName: 'Summary', fieldValue: 'Test summary' },
			{ fieldId: 'amount-field', fieldName: 'Amount', fieldValue: '125.50' },
		].map(({ fieldId, fieldName, fieldValue }) => ({
			description: `should update the ${fieldName} custom field with a flat ID and fieldValue`,
			updateFields: {
				firstName: 'Alex',
				customFields: {
					values: [
						{
							fieldId: {
								__rl: true,
								value: fieldId,
								mode: 'list',
								cachedResultName: fieldName,
							},
							fieldValue,
						},
					],
				},
			},
			expectedBody: { firstName: 'Alex', customFields: [{ id: fieldId, fieldValue }] },
		})),
	];

	for (const { description, updateFields, expectedBody } of cases) {
		harness.setupTest(
			{
				description,
				input: { workflowData: workflow(updateFields) },
				output: { nodeData: { 'Update a contact': [[{ json: { id: 'contact-1' } }]] } },
				credentials,
			},
			{
				customAssertions: () => {
					expect(nock.isDone()).toBe(true);
					expect(requestBody).toEqual(expectedBody);
				},
			},
		);
	}
});
