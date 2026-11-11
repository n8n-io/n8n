import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const cleanupUserFolder = await vi.hoisted(async () => {
	const { mkdtempSync, rmSync } = await import('node:fs');
	const { tmpdir } = await import('node:os');
	const { join } = await import('node:path');
	const userFolder = mkdtempSync(join(tmpdir(), 'n8n-highlevel-contact-upsert-'));
	vi.stubEnv('N8N_USER_FOLDER', userFolder);

	return () => {
		vi.unstubAllEnvs();
		rmSync(userFolder, { recursive: true, force: true });
	};
});

describe('HighLevel v2 contact create or update', () => {
	const harness = new NodeTestHarness();
	let requestBody: unknown;

	beforeEach(() => {
		requestBody = undefined;
		nock('https://services.leadconnectorhq.com')
			.post('/contacts/upsert/')
			.matchHeader('Version', '2021-07-28')
			.matchHeader('Content-Type', 'application/json')
			.reply(200, (_uri, body) => {
				requestBody = body;
				return { contact: { id: 'contact-1' } };
			});
	});

	afterEach(() => nock.cleanAll());
	afterAll(cleanupUserFolder);

	harness.setupTest(
		{
			description: 'should upsert text and monetary custom fields with flat IDs and fieldValue',
			input: {
				workflowData: {
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
							name: 'Create or update a contact',
							type: 'n8n-nodes-base.highLevel',
							typeVersion: 2,
							position: [200, 0],
							credentials: { highLevelOAuth2Api: { id: 'credential-1', name: 'HighLevel' } },
							parameters: {
								resource: 'contact',
								operation: 'create',
								email: 'alex@example.com',
								phone: '+12025550123',
								additionalFields: {
									firstName: 'Alex',
									customFields: {
										values: [
											{
												fieldId: {
													__rl: true,
													value: 'summary-field',
													mode: 'list',
													cachedResultName: 'Summary',
												},
												fieldValue: 'Test summary',
											},
											{
												fieldId: { __rl: true, value: 'amount-field', mode: 'id' },
												fieldValue: '125.50',
											},
										],
									},
								},
								requestOptions: {},
							},
						},
					],
					connections: {
						Trigger: { main: [[{ node: 'Create or update a contact', type: 'main', index: 0 }]] },
					},
				},
			},
			output: { nodeData: { 'Create or update a contact': [[{ json: { id: 'contact-1' } }]] } },
			credentials: {
				highLevelOAuth2Api: {
					oauthTokenData: { access_token: 'test-token', locationId: 'location-1' },
				},
			},
		},
		{
			customAssertions: () => {
				expect(nock.isDone()).toBe(true);
				expect(requestBody).toEqual({
					email: 'alex@example.com',
					phone: '+12025550123',
					firstName: 'Alex',
					locationId: 'location-1',
					customFields: [
						{ id: 'summary-field', fieldValue: 'Test summary' },
						{ id: 'amount-field', fieldValue: '125.50' },
					],
				});
			},
		},
	);
});
