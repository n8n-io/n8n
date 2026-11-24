import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { constructExecutionMetaData } from 'n8n-core';
import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import { googleApiCredentials } from './credentials.fixture';
import { execute } from '../../../v2/actions/database/executeQuery.operation';

describe('Test Google BigQuery V2, executeQuery', () => {
	// The harness loads the node from dist via require(), so the real jsonwebtoken
	// signing path runs (a real RSA key is supplied via credentials). The signed
	// assertion is non-deterministic, so match any POST to the token endpoint.
	nock('https://oauth2.googleapis.com')
		.persist()
		.post('/token')
		.reply(200, { access_token: 'token' });

	nock('https://bigquery.googleapis.com/bigquery')
		.post('/v2/projects/test-project/jobs', {
			configuration: {
				query: {
					query: 'SELECT * FROM bigquery_node_dev_test_dataset.test_json;',
					useLegacySql: false,
				},
			},
		})
		.reply(200, {
			jobReference: {
				jobId: 'job_123',
			},
			status: {
				state: 'DONE',
			},
		})
		.get('/v2/projects/test-project/queries/job_123')
		.reply(200)
		.get('/v2/projects/test-project/queries/job_123?maxResults=1000&timeoutMs=10000')
		.reply(200, { rows: [], schema: {} });

	new NodeTestHarness().setupTests({
		workflowFiles: ['executeQuery.workflow.json'],
		credentials: { googleApi: googleApiCredentials },
	});
});

describe('Test Google BigQuery V2, executeQuery expression resolution', () => {
	it.each([
		{ typeVersion: 2.2, expected: "select '1$&2', '1$$2', '^[0-9]+$'" },
		{ typeVersion: 2.1, expected: "select '1{{ $json.sql }}2', '1$2', '^[0-9]+" },
	])(
		'should insert the resolved query for version $typeVersion',
		async ({ typeVersion, expected }) => {
			const nodeParameters: IDataObject = {
				authentication: 'oAuth2',
				projectId: 'test-project',
				sqlQuery: '{{ $json.sql }}',
				options: {},
			};
			const requestOAuth2 = vi.fn().mockResolvedValue({
				jobReference: { jobId: 'job_123' },
				status: { state: 'DONE' },
			});
			const executeFunctions = mock<IExecuteFunctions>({
				getExecutionCancelSignal: () => undefined,
				getInputData: () => [{ json: {} }],
				getNode: () => mock<INode>({ typeVersion }),
				getNodeParameter: ((name: string) =>
					nodeParameters[name]) as IExecuteFunctions['getNodeParameter'],
				evaluateExpression: () => "select '1$&2', '1$$2', '^[0-9]+$'",
				helpers: mock({ constructExecutionMetaData, requestOAuth2 }),
			});

			await execute.call(executeFunctions);

			expect(requestOAuth2).toHaveBeenCalledWith(
				'googleBigQueryOAuth2Api',
				expect.objectContaining({
					body: { configuration: { query: { query: expected, useLegacySql: false } } },
				}),
			);
		},
	);
});
