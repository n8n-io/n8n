import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { constructExecutionMetaData } from 'n8n-core';
import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import { googleApiCredentials } from './credentials.fixture';
import { GoogleBigQuery } from '../../../GoogleBigQuery.node';
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

describe('Test Google BigQuery V2, executeQuery DML output', () => {
	const createExecuteFunctions = ({
		sqlQuery,
		options = {},
		jobResponse,
		queryResponse,
		typeVersion = 2.3,
	}: {
		sqlQuery: string;
		options?: IDataObject;
		jobResponse: IDataObject;
		queryResponse: IDataObject;
		typeVersion?: number;
	}) => {
		const nodeParameters: IDataObject = {
			authentication: 'oAuth2',
			projectId: 'test-project',
			sqlQuery,
			options: { ...options },
		};
		const requestOAuth2 = vi
			.fn()
			.mockResolvedValueOnce(jobResponse)
			.mockResolvedValueOnce(queryResponse);
		const executeFunctions = mock<IExecuteFunctions>({
			continueOnFail: () => false,
			getExecutionCancelSignal: () => undefined,
			getInputData: () => [{ json: {} }],
			getNode: () => mock<INode>({ typeVersion }),
			getNodeParameter: ((name: string) =>
				nodeParameters[name]) as IExecuteFunctions['getNodeParameter'],
			evaluateExpression: vi.fn(),
			helpers: mock({ constructExecutionMetaData, requestOAuth2 }),
		});

		return { executeFunctions, requestOAuth2 };
	};

	it('should register version 2.3 as the default version', () => {
		const node = new GoogleBigQuery();

		expect(node.description.defaultVersion).toBe(2.3);
		expect(node.getNodeType().description.version).toContain(2.3);
		expect(node.getNodeType(2.3)).toBeDefined();
	});

	// NODE-5869: BigQuery omits rows and returns schema: {} with numDmlAffectedRows for DML queries.
	// Execute Query must emit a confirmation item with numDmlAffectedRows instead of zero items.
	it.each([
		{
			statement: 'MERGE',
			sqlQuery:
				'MERGE INTO dataset.target t USING dataset.source s ON t.id = s.id WHEN MATCHED THEN UPDATE SET t.val = s.val',
			numDmlAffectedRows: '5',
		},
		{
			statement: 'INSERT',
			sqlQuery: "INSERT INTO dataset.target (id, val) VALUES (1, 'a'), (2, 'b')",
			numDmlAffectedRows: '2',
		},
		{
			statement: 'UPDATE',
			sqlQuery: "UPDATE dataset.target SET val = 'x' WHERE id = 1",
			numDmlAffectedRows: '1',
		},
		{
			statement: 'DELETE',
			sqlQuery: 'DELETE FROM dataset.target WHERE id = 999',
			numDmlAffectedRows: '0',
		},
	])(
		'should return success and numDmlAffectedRows for a synchronous $statement statement',
		async ({ sqlQuery, numDmlAffectedRows }) => {
			const { executeFunctions, requestOAuth2 } = createExecuteFunctions({
				sqlQuery,
				jobResponse: {
					kind: 'bigquery#job',
					jobReference: { projectId: 'test-project', jobId: 'job_dml_sync', location: 'US' },
					status: { state: 'DONE' },
				},
				queryResponse: {
					kind: 'bigquery#getQueryResultsResponse',
					etag: 'etag_sync',
					schema: {},
					jobReference: { projectId: 'test-project', jobId: 'job_dml_sync', location: 'US' },
					totalBytesProcessed: '1024',
					jobComplete: true,
					cacheHit: false,
					numDmlAffectedRows,
				},
			});

			const result = await execute.call(executeFunctions);

			expect(requestOAuth2).toHaveBeenCalledTimes(2);
			expect(result).toEqual([
				{
					json: {
						success: true,
						numDmlAffectedRows,
					},
					pairedItem: { item: 0 },
				},
			]);
		},
	);

	// NODE-5869: The async job-polling path calls prepareOutput and must also return numDmlAffectedRows.
	it('should return success and numDmlAffectedRows for an async polling DML job', async () => {
		const { executeFunctions, requestOAuth2 } = createExecuteFunctions({
			sqlQuery:
				'MERGE INTO dataset.target t USING dataset.source s ON t.id = s.id WHEN NOT MATCHED THEN INSERT (id) VALUES (s.id)',
			jobResponse: {
				kind: 'bigquery#job',
				jobReference: { projectId: 'test-project', jobId: 'job_dml_async', location: 'US' },
				status: { state: 'RUNNING' },
			},
			queryResponse: {
				kind: 'bigquery#getQueryResultsResponse',
				etag: 'etag_async',
				schema: {},
				jobReference: { projectId: 'test-project', jobId: 'job_dml_async', location: 'US' },
				totalBytesProcessed: '2048',
				jobComplete: true,
				cacheHit: false,
				numDmlAffectedRows: '12',
			},
		});

		const result = await execute.call(executeFunctions);

		expect(requestOAuth2).toHaveBeenCalledTimes(2);
		expect(result).toEqual([
			{
				json: {
					success: true,
					numDmlAffectedRows: '12',
				},
				pairedItem: { item: 0 },
			},
		]);
	});

	// NODE-5869: Preserve numDmlAffectedRows even when BigQuery omits schema.
	it('should include numDmlAffectedRows when schema is absent on a DML response', async () => {
		const { executeFunctions, requestOAuth2 } = createExecuteFunctions({
			sqlQuery: 'INSERT INTO dataset.target (id) VALUES (1), (2), (3)',
			jobResponse: {
				kind: 'bigquery#job',
				jobReference: { projectId: 'test-project', jobId: 'job_dml_no_schema', location: 'US' },
				status: { state: 'DONE' },
			},
			queryResponse: {
				kind: 'bigquery#getQueryResultsResponse',
				etag: 'etag_no_schema',
				jobReference: { projectId: 'test-project', jobId: 'job_dml_no_schema', location: 'US' },
				totalBytesProcessed: '512',
				jobComplete: true,
				cacheHit: false,
				numDmlAffectedRows: '3',
			},
		});

		const result = await execute.call(executeFunctions);

		expect(requestOAuth2).toHaveBeenCalledTimes(2);
		expect(result).toEqual([
			{
				json: {
					success: true,
					numDmlAffectedRows: '3',
				},
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should still return zero items for a SELECT query with no matching rows', async () => {
		const { executeFunctions, requestOAuth2 } = createExecuteFunctions({
			sqlQuery: 'SELECT id, val FROM dataset.target WHERE 1 = 0',
			jobResponse: {
				kind: 'bigquery#job',
				jobReference: { projectId: 'test-project', jobId: 'job_select_empty', location: 'US' },
				status: { state: 'DONE' },
			},
			queryResponse: {
				kind: 'bigquery#getQueryResultsResponse',
				etag: 'etag_empty_select',
				schema: {
					fields: [
						{ name: 'id', type: 'INTEGER', mode: 'NULLABLE' },
						{ name: 'val', type: 'STRING', mode: 'NULLABLE' },
					],
				},
				jobReference: { projectId: 'test-project', jobId: 'job_select_empty', location: 'US' },
				totalRows: '0',
				totalBytesProcessed: '0',
				jobComplete: true,
				cacheHit: false,
			},
		});

		const result = await execute.call(executeFunctions);

		expect(requestOAuth2).toHaveBeenCalledTimes(2);
		expect(result).toEqual([]);
	});

	it('should preserve numDmlAffectedRows when Raw Output is enabled', async () => {
		const { executeFunctions, requestOAuth2 } = createExecuteFunctions({
			sqlQuery:
				'MERGE INTO dataset.target t USING dataset.source s ON t.id = s.id WHEN MATCHED THEN UPDATE SET t.val = s.val',
			options: { rawOutput: true },
			jobResponse: {
				kind: 'bigquery#job',
				jobReference: { projectId: 'test-project', jobId: 'job_dml_raw', location: 'US' },
				status: { state: 'DONE' },
			},
			queryResponse: {
				kind: 'bigquery#getQueryResultsResponse',
				etag: 'etag_raw',
				schema: {},
				jobReference: { projectId: 'test-project', jobId: 'job_dml_raw', location: 'US' },
				totalBytesProcessed: '1024',
				jobComplete: true,
				cacheHit: false,
				numDmlAffectedRows: '5',
			},
		});

		const result = await execute.call(executeFunctions);

		expect(requestOAuth2).toHaveBeenCalledTimes(2);
		expect(result).toEqual([
			{
				json: expect.objectContaining({
					jobComplete: true,
					numDmlAffectedRows: '5',
				}),
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should include _schema on DML output when Include Schema in Output is enabled', async () => {
		const { executeFunctions, requestOAuth2 } = createExecuteFunctions({
			sqlQuery: "UPDATE dataset.target SET val = 'x' WHERE id = 1",
			options: { includeSchema: true },
			jobResponse: {
				kind: 'bigquery#job',
				jobReference: { projectId: 'test-project', jobId: 'job_dml_schema', location: 'US' },
				status: { state: 'DONE' },
			},
			queryResponse: {
				kind: 'bigquery#getQueryResultsResponse',
				etag: 'etag_schema',
				schema: {},
				jobReference: { projectId: 'test-project', jobId: 'job_dml_schema', location: 'US' },
				totalBytesProcessed: '512',
				jobComplete: true,
				cacheHit: false,
				numDmlAffectedRows: '1',
			},
		});

		const result = await execute.call(executeFunctions);

		expect(requestOAuth2).toHaveBeenCalledTimes(2);
		expect(result).toEqual([
			{
				json: {
					success: true,
					numDmlAffectedRows: '1',
					_schema: {},
				},
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should keep legacy empty output for version 2.2 DML responses with schema', async () => {
		const { executeFunctions, requestOAuth2 } = createExecuteFunctions({
			sqlQuery:
				'MERGE INTO dataset.target t USING dataset.source s ON t.id = s.id WHEN MATCHED THEN UPDATE SET t.val = s.val',
			typeVersion: 2.2,
			jobResponse: {
				kind: 'bigquery#job',
				jobReference: { projectId: 'test-project', jobId: 'job_dml_v22', location: 'US' },
				status: { state: 'DONE' },
			},
			queryResponse: {
				kind: 'bigquery#getQueryResultsResponse',
				etag: 'etag_v22',
				schema: {},
				jobReference: { projectId: 'test-project', jobId: 'job_dml_v22', location: 'US' },
				totalBytesProcessed: '1024',
				jobComplete: true,
				cacheHit: false,
				numDmlAffectedRows: '5',
			},
		});

		const result = await execute.call(executeFunctions);

		expect(requestOAuth2).toHaveBeenCalledTimes(2);
		expect(result).toEqual([]);
	});

	it('should keep legacy success output without numDmlAffectedRows for version 2.2 when schema is absent', async () => {
		const { executeFunctions, requestOAuth2 } = createExecuteFunctions({
			sqlQuery: 'INSERT INTO dataset.target (id) VALUES (1)',
			typeVersion: 2.2,
			jobResponse: {
				kind: 'bigquery#job',
				jobReference: { projectId: 'test-project', jobId: 'job_dml_v22_noschema', location: 'US' },
				status: { state: 'DONE' },
			},
			queryResponse: {
				kind: 'bigquery#getQueryResultsResponse',
				etag: 'etag_v22_noschema',
				jobReference: { projectId: 'test-project', jobId: 'job_dml_v22_noschema', location: 'US' },
				totalBytesProcessed: '512',
				jobComplete: true,
				cacheHit: false,
				numDmlAffectedRows: '1',
			},
		});

		const result = await execute.call(executeFunctions);

		expect(requestOAuth2).toHaveBeenCalledTimes(2);
		expect(result).toEqual([
			{
				json: {
					success: true,
				},
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should preserve pairedItem across multiple input items for sync and async DML jobs', async () => {
		const queries = [
			"INSERT INTO dataset.target (id, val) VALUES (1, 'a')",
			'DELETE FROM dataset.target WHERE id = 2',
		];
		const requestOAuth2 = vi
			.fn()
			.mockResolvedValueOnce({
				kind: 'bigquery#job',
				jobReference: { projectId: 'test-project', jobId: 'job_sync_0', location: 'US' },
				status: { state: 'DONE' },
			})
			.mockResolvedValueOnce({
				kind: 'bigquery#getQueryResultsResponse',
				schema: {},
				jobReference: { projectId: 'test-project', jobId: 'job_sync_0', location: 'US' },
				jobComplete: true,
				numDmlAffectedRows: '1',
			})
			.mockResolvedValueOnce({
				kind: 'bigquery#job',
				jobReference: { projectId: 'test-project', jobId: 'job_async_1', location: 'US' },
				status: { state: 'RUNNING' },
			})
			.mockResolvedValueOnce({
				kind: 'bigquery#getQueryResultsResponse',
				schema: {},
				jobReference: { projectId: 'test-project', jobId: 'job_async_1', location: 'US' },
				jobComplete: true,
				numDmlAffectedRows: '4',
			});
		const executeFunctions = mock<IExecuteFunctions>({
			continueOnFail: () => false,
			getExecutionCancelSignal: () => undefined,
			getInputData: () => [{ json: {} }, { json: {} }],
			getNode: () => mock<INode>({ typeVersion: 2.3 }),
			getNodeParameter: ((name: string, itemIndex: number) => {
				if (name === 'authentication') return 'oAuth2';
				if (name === 'projectId') return 'test-project';
				if (name === 'sqlQuery') return queries[itemIndex];
				if (name === 'options') return {};
				return undefined;
			}) as IExecuteFunctions['getNodeParameter'],
			evaluateExpression: vi.fn(),
			helpers: mock({ constructExecutionMetaData, requestOAuth2 }),
		});

		const result = await execute.call(executeFunctions);

		expect(requestOAuth2).toHaveBeenCalledTimes(4);
		expect(result).toEqual([
			{
				json: { success: true, numDmlAffectedRows: '1' },
				pairedItem: { item: 0 },
			},
			{
				json: { success: true, numDmlAffectedRows: '4' },
				pairedItem: { item: 1 },
			},
		]);
	});
});
