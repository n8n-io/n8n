import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import { constructExecutionMetaData } from 'n8n-core';
import type {
	GenericValue,
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeProperties,
	INodePropertyCollection,
	INodePropertyOptions,
} from 'n8n-workflow';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import { googleApiCredentials } from './credentials.fixture';
import { GoogleBigQuery } from '../../../GoogleBigQuery.node';
import { description, execute } from '../../../v2/actions/database/executeQuery.operation';

describe('Test Google BigQuery V2, executeQuery with named parameters', () => {
	nock('https://oauth2.googleapis.com')
		.persist()
		.post('/token')
		.reply(200, { access_token: 'token' });

	nock('https://bigquery.googleapis.com/bigquery')
		.post('/v2/projects/test-project/jobs', {
			configuration: {
				query: {
					queryParameters: [
						{
							name: 'email',
							parameterType: { type: 'STRING' },
							parameterValue: { value: 'test@n8n.io' },
						},
						{
							name: 'name',
							parameterType: { type: 'STRING' },
							parameterValue: { value: 'Test Testerson' },
						},
						{
							name: 'n8n_variable',
							parameterType: { type: 'STRING' },
							parameterValue: { value: '42' },
						},
					],
					query:
						'SELECT * FROM bigquery_node_dev_test_dataset.test_json WHERE email = @email AND name = @name AND n8n_variable = @n8n_variable;',
					useLegacySql: false,
					parameterMode: 'NAMED',
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
		workflowFiles: ['executeQuery.queryParameters.workflow.json'],
		credentials: { googleApi: googleApiCredentials },
	});
});

describe('Test Google BigQuery V2, executeQuery named parameter types (NODE-5865)', () => {
	const isNodeProperties = (
		option: INodeProperties | INodePropertyOptions | INodePropertyCollection,
	): option is INodeProperties => 'type' in option;

	const isNodePropertyCollection = (
		option: INodeProperties | INodePropertyOptions | INodePropertyCollection,
	): option is INodePropertyCollection => 'values' in option;

	const isNodePropertyOption = (
		option: INodeProperties | INodePropertyOptions | INodePropertyCollection,
	): option is INodePropertyOptions => 'value' in option;

	const namedParameter = (name: string, value: unknown, type?: string): IDataObject =>
		type === undefined
			? { name, value: value as GenericValue }
			: { name, value: value as GenericValue, type };

	const runExecuteQueryWithOptions = async (
		queryParameters: unknown,
		sqlQuery = 'SELECT * FROM dataset.customers WHERE customer_id = @customer_id;',
	) => {
		const nodeParameters: IDataObject = {
			authentication: 'oAuth2',
			projectId: 'test-project',
			sqlQuery,
			options: {
				queryParameters: queryParameters as GenericValue,
			},
		};
		const requestOAuth2 = vi.fn().mockResolvedValue({
			jobReference: { jobId: 'job_123' },
			status: { state: 'DONE' },
		});
		const executeFunctions = mock<IExecuteFunctions>({
			getExecutionCancelSignal: () => undefined,
			getInputData: () => [{ json: {} }],
			getNode: () => mock<INode>({ typeVersion: 2.2 }),
			getNodeParameter: ((name: string, _itemIndex: number, fallbackValue?: unknown) => {
				const resolved = name
					.split('.')
					.reduce<unknown>(
						(acc, key) =>
							acc !== null && typeof acc === 'object' && key in acc
								? (acc as Record<string, unknown>)[key]
								: undefined,
						nodeParameters,
					);
				return resolved ?? fallbackValue;
			}) as IExecuteFunctions['getNodeParameter'],
			evaluateExpression: (expression: string) => expression,
			helpers: mock({ constructExecutionMetaData, requestOAuth2 }),
		});

		await execute.call(executeFunctions);

		return requestOAuth2;
	};

	const runExecuteQuery = async (
		namedParameters: IDataObject[],
		sqlQuery = 'SELECT * FROM dataset.customers WHERE customer_id = @customer_id;',
	) => await runExecuteQueryWithOptions({ namedParameters }, sqlQuery);

	it('should send plain string named parameters with STRING type', async () => {
		const requestOAuth2 = await runExecuteQuery(
			[namedParameter('email', 'test@n8n.io')],
			'SELECT * FROM dataset.customers WHERE email = @email;',
		);

		expect(requestOAuth2).toHaveBeenNthCalledWith(
			1,
			'googleBigQueryOAuth2Api',
			expect.objectContaining({
				method: 'POST',
				body: {
					configuration: {
						query: {
							query: 'SELECT * FROM dataset.customers WHERE email = @email;',
							useLegacySql: false,
							parameterMode: 'NAMED',
							queryParameters: [
								{
									name: 'email',
									parameterType: { type: 'STRING' },
									parameterValue: { value: 'test@n8n.io' },
								},
							],
						},
					},
				},
			}),
		);
	});

	// NODE-5865: Execute Query hardcodes every named parameter to STRING and leaves values unstringified.
	it.each([
		{ paramName: 'customer_id', paramValue: 42, paramType: 'INT64', expectedValue: '42' },
		{ paramName: 'price', paramValue: 19.99, paramType: 'FLOAT64', expectedValue: '19.99' },
		{ paramName: 'amount', paramValue: '19.99', paramType: 'NUMERIC', expectedValue: '19.99' },
		{ paramName: 'is_active', paramValue: true, paramType: 'BOOL', expectedValue: 'true' },
		{
			paramName: 'event_date',
			paramValue: '2026-01-15',
			paramType: 'DATE',
			expectedValue: '2026-01-15',
		},
		{
			paramName: 'created_at',
			paramValue: '2026-01-15T10:30:00Z',
			paramType: 'TIMESTAMP',
			expectedValue: '2026-01-15T10:30:00Z',
		},
		{
			paramName: 'total_balance',
			paramValue: '12345678901234567890.123456789',
			paramType: 'BIGNUMERIC',
			expectedValue: '12345678901234567890.123456789',
		},
		{
			paramName: 'event_datetime',
			paramValue: '2026-01-15 10:30:00',
			paramType: 'DATETIME',
			expectedValue: '2026-01-15 10:30:00',
		},
		{
			paramName: 'event_time',
			paramValue: '10:30:00',
			paramType: 'TIME',
			expectedValue: '10:30:00',
		},
		{
			paramName: 'raw_bytes',
			paramValue: 'aGVsbG8=',
			paramType: 'BYTES',
			expectedValue: 'aGVsbG8=',
		},
		{
			paramName: 'payload',
			paramValue: { customerId: 42, active: true },
			paramType: 'JSON',
			expectedValue: '{"customerId":42,"active":true}',
		},
	])(
		'should send $paramType parameterType and stringified parameterValue for $paramName',
		async ({ paramName, paramValue, paramType, expectedValue }) => {
			const sqlQuery = `SELECT * FROM dataset.customers WHERE ${paramName} = @${paramName};`;
			const requestOAuth2 = await runExecuteQuery(
				[namedParameter(paramName, paramValue, paramType)],
				sqlQuery,
			);

			expect(requestOAuth2).toHaveBeenNthCalledWith(
				1,
				'googleBigQueryOAuth2Api',
				expect.objectContaining({
					method: 'POST',
					body: {
						configuration: {
							query: {
								query: sqlQuery,
								useLegacySql: false,
								parameterMode: 'NAMED',
								queryParameters: [
									{
										name: paramName,
										parameterType: { type: paramType },
										parameterValue: { value: expectedValue },
									},
								],
							},
						},
					},
				}),
			);
		},
	);

	it('should stringify non-string values when parameter type defaults to STRING', async () => {
		// NODE-5865: Keep STRING as the default when type is omitted and serialize the value as a string.
		const requestOAuth2 = await runExecuteQuery([namedParameter('customer_id', 42)]);

		expect(requestOAuth2).toHaveBeenNthCalledWith(
			1,
			'googleBigQueryOAuth2Api',
			expect.objectContaining({
				method: 'POST',
				body: {
					configuration: {
						query: {
							query: 'SELECT * FROM dataset.customers WHERE customer_id = @customer_id;',
							useLegacySql: false,
							parameterMode: 'NAMED',
							queryParameters: [
								{
									name: 'customer_id',
									parameterType: { type: 'STRING' },
									parameterValue: { value: '42' },
								},
							],
						},
					},
				},
			}),
		);
	});

	it('should expose a BigQuery type option on named query parameters', () => {
		// NODE-5865: Named query parameters must expose a BigQuery type option.
		const optionsProperty = description.find((property) => property.name === 'options');
		const queryParametersProperty = optionsProperty?.options
			?.filter(isNodeProperties)
			.find((option) => option.name === 'queryParameters');
		const namedParametersCollection = queryParametersProperty?.options
			?.filter(isNodePropertyCollection)
			.find((option) => option.name === 'namedParameters');
		const typeProperty = namedParametersCollection?.values.find((field) => field.name === 'type');

		expect(typeProperty).toBeDefined();
		expect(typeProperty?.type).toBe('options');
		expect(typeProperty?.default).toBe('STRING');

		const optionValues = typeProperty?.options
			?.filter(isNodePropertyOption)
			.map((option) => option.value);

		expect(optionValues).toEqual(
			expect.arrayContaining([
				'BIGNUMERIC',
				'BOOL',
				'BYTES',
				'DATE',
				'DATETIME',
				'FLOAT64',
				'INT64',
				'JSON',
				'NUMERIC',
				'STRING',
				'TIME',
				'TIMESTAMP',
			]),
		);
	});

	it('should serialize null, undefined, falsy scalars, Date, and Buffer values cleanly', async () => {
		const sqlQuery =
			'MERGE dataset.customers AS target USING (SELECT @customer_id AS customer_id, @count AS count, @is_active AS is_active, @empty_text AS empty_text, @optional_id AS optional_id, @missing_id AS missing_id, @created_at AS created_at, @raw_bytes AS raw_bytes) AS source ON target.customer_id = source.customer_id WHEN NOT MATCHED THEN INSERT ROW;';
		const requestOAuth2 = await runExecuteQuery(
			[
				namedParameter('customer_id', 42, 'INT64'),
				namedParameter('count', 0, 'INT64'),
				namedParameter('is_active', false, 'BOOL'),
				namedParameter('empty_text', '', 'STRING'),
				namedParameter('optional_id', null, 'INT64'),
				namedParameter('missing_id', undefined, 'INT64'),
				namedParameter('created_at', new Date('2026-01-15T10:30:00Z'), 'TIMESTAMP'),
				namedParameter('raw_bytes', Buffer.from('hello'), 'BYTES'),
			],
			sqlQuery,
		);

		expect(requestOAuth2).toHaveBeenNthCalledWith(
			1,
			'googleBigQueryOAuth2Api',
			expect.objectContaining({
				method: 'POST',
				body: {
					configuration: {
						query: {
							query: sqlQuery,
							useLegacySql: false,
							parameterMode: 'NAMED',
							queryParameters: [
								{
									name: 'customer_id',
									parameterType: { type: 'INT64' },
									parameterValue: { value: '42' },
								},
								{
									name: 'count',
									parameterType: { type: 'INT64' },
									parameterValue: { value: '0' },
								},
								{
									name: 'is_active',
									parameterType: { type: 'BOOL' },
									parameterValue: { value: 'false' },
								},
								{
									name: 'empty_text',
									parameterType: { type: 'STRING' },
									parameterValue: { value: '' },
								},
								{
									name: 'optional_id',
									parameterType: { type: 'INT64' },
									parameterValue: { value: null },
								},
								{
									name: 'missing_id',
									parameterType: { type: 'INT64' },
									parameterValue: { value: null },
								},
								{
									name: 'created_at',
									parameterType: { type: 'TIMESTAMP' },
									parameterValue: { value: '2026-01-15T10:30:00.000Z' },
								},
								{
									name: 'raw_bytes',
									parameterType: { type: 'BYTES' },
									parameterValue: { value: 'aGVsbG8=' },
								},
							],
						},
					},
				},
			}),
		);
	});

	it('should default empty parameter type string to STRING', async () => {
		const requestOAuth2 = await runExecuteQuery([namedParameter('customer_id', 42, '')]);

		expect(requestOAuth2).toHaveBeenNthCalledWith(
			1,
			'googleBigQueryOAuth2Api',
			expect.objectContaining({
				method: 'POST',
				body: {
					configuration: {
						query: {
							query: 'SELECT * FROM dataset.customers WHERE customer_id = @customer_id;',
							useLegacySql: false,
							parameterMode: 'NAMED',
							queryParameters: [
								{
									name: 'customer_id',
									parameterType: { type: 'STRING' },
									parameterValue: { value: '42' },
								},
							],
						},
					},
				},
			}),
		);
	});

	it.each([
		{ label: 'null queryParameters', queryParameters: null },
		{ label: 'missing namedParameters', queryParameters: {} },
		{ label: 'empty namedParameters array', queryParameters: { namedParameters: [] } },
	])('should omit queryParameters and parameterMode for $label', async ({ queryParameters }) => {
		const sqlQuery = 'SELECT 1;';
		const requestOAuth2 = await runExecuteQueryWithOptions(queryParameters, sqlQuery);

		expect(requestOAuth2).toHaveBeenNthCalledWith(
			1,
			'googleBigQueryOAuth2Api',
			expect.objectContaining({
				method: 'POST',
				body: {
					configuration: {
						query: {
							query: sqlQuery,
							useLegacySql: false,
						},
					},
				},
			}),
		);
	});

	it('should send typed named parameters through GoogleBigQuery v2.2 node execution', async () => {
		const nodeType = new GoogleBigQuery().getNodeType(2.2);
		const sqlQuery = 'SELECT * FROM dataset.customers WHERE customer_id = @customer_id;';
		const nodeParameters: IDataObject = {
			resource: 'database',
			operation: 'executeQuery',
			authentication: 'oAuth2',
			projectId: 'test-project',
			sqlQuery,
			options: {
				queryParameters: {
					namedParameters: [namedParameter('customer_id', 42, 'INT64')],
				},
			},
		};
		const requestOAuth2 = vi.fn().mockResolvedValue({
			jobReference: { jobId: 'job_123' },
			status: { state: 'DONE' },
		});
		const executeFunctions = mock<IExecuteFunctions>({
			getExecutionCancelSignal: () => undefined,
			getInputData: () => [{ json: {} }],
			getNode: () => mock<INode>({ typeVersion: 2.2 }),
			getNodeParameter: ((name: string, _itemIndex: number, fallbackValue?: unknown) =>
				nodeParameters[name] ?? fallbackValue) as IExecuteFunctions['getNodeParameter'],
			evaluateExpression: (expression: string) => expression,
			helpers: mock({ constructExecutionMetaData, requestOAuth2 }),
		});

		await nodeType.execute?.call(executeFunctions);

		expect(requestOAuth2).toHaveBeenNthCalledWith(
			1,
			'googleBigQueryOAuth2Api',
			expect.objectContaining({
				method: 'POST',
				body: {
					configuration: {
						query: {
							query: sqlQuery,
							useLegacySql: false,
							parameterMode: 'NAMED',
							queryParameters: [
								{
									name: 'customer_id',
									parameterType: { type: 'INT64' },
									parameterValue: { value: '42' },
								},
							],
						},
					},
				},
			}),
		);
	});
});
