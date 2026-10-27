import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('MondayCom', () => {
	const mondayApiUrl = 'https://api.monday.com';
	const apiVersion = '2026-07';

	/**
	 * Shared column_values mock data aligned with API version 2026-07.
	 * Since 2025-04 the value field is null for these column types, so the data
	 * comes from typed fragments instead:
	 * - BoardRelationValue: display_value and linked_item_ids
	 * - DependencyValue: display_value and linked_item_ids
	 * - MirrorValue: display_value
	 * - SubtasksValue: display_value and subitems { id name }
	 * Ref: https://developer.monday.com/api-reference/reference/connect
	 * Ref: https://developer.monday.com/api-reference/reference/dependency
	 * Ref: https://developer.monday.com/api-reference/reference/mirror
	 * Ref: https://developer.monday.com/api-reference/reference/subitems-column
	 */
	const columnValuesWithFragments = [
		{
			id: 'status',
			text: 'Working on it',
			type: 'status',
			value: '{"index":1}',
			column: {
				title: 'Status',
				archived: false,
				description: null,
				settings_str: '{}',
			},
		},
		{
			id: 'connect_boards',
			text: null,
			type: 'board_relation',
			value: null,
			display_value: 'Related Item 1',
			linked_item_ids: ['5566778899'],
			column: {
				title: 'Connected Board',
				archived: false,
				description: null,
				settings_str: '{}',
			},
		},
		{
			id: 'subtasks_col',
			text: null,
			type: 'subtasks',
			value: null,
			display_value: 'Subtask A',
			subitems: [{ id: '111222333', name: 'Subtask A' }],
			column: {
				title: 'Subitems',
				archived: false,
				description: null,
				settings_str: '{}',
			},
		},
		{
			id: 'dependency_col',
			text: null,
			type: 'dependency',
			value: null,
			display_value: 'Dep Item 1',
			linked_item_ids: ['4433221100'],
			column: {
				title: 'Dependencies',
				archived: false,
				description: null,
				settings_str: '{}',
			},
		},
		{
			id: 'mirror_col',
			text: null,
			type: 'mirror',
			value: null,
			display_value: 'Mirrored Value',
			column: {
				title: 'Mirror',
				archived: false,
				description: null,
				settings_str: '{}',
			},
		},
	];

	const itemData = {
		id: '1234567890',
		name: 'Test Item',
		created_at: '2026-02-20T10:00:00Z',
		state: 'active',
		column_values: columnValuesWithFragments,
	};

	/** Checks that the GraphQL query uses the documented field structure */
	function hasExpectedQueryStructure(body: Record<string, unknown>): boolean {
		const query = body.query as string;
		return (
			query.includes('... on BoardRelationValue') &&
			query.includes('... on DependencyValue') &&
			query.includes('... on MirrorValue') &&
			query.includes('... on SubtasksValue') &&
			/\bsubitems\s*\{\s*id\s+name\s*\}/.test(query) &&
			query.includes('display_value') &&
			query.includes('linked_item_ids')
		);
	}

	describe('boardItem:get - returns subitems and board relation data', () => {
		beforeAll(() => {
			nock(mondayApiUrl)
				.post('/v2/', (body: Record<string, unknown>) => {
					const query = body.query as string;
					return query.includes('items (ids: $itemId)') && hasExpectedQueryStructure(body);
				})
				.reply(200, { data: { items: [itemData] } });
		});

		new NodeTestHarness().setupTests({
			workflowFiles: ['get.workflow.json'],
		});
	});

	describe('boardItem:getAll - returns subitems and board relation data', () => {
		beforeAll(() => {
			nock(mondayApiUrl)
				.post('/v2/', (body: Record<string, unknown>) => {
					const query = body.query as string;
					return query.includes('items_page') && hasExpectedQueryStructure(body);
				})
				.reply(200, {
					data: {
						boards: [
							{
								groups: [
									{
										id: 'group1',
										items_page: {
											cursor: null,
											items: [itemData],
										},
									},
								],
							},
						],
					},
				});
		});

		new NodeTestHarness().setupTests({
			workflowFiles: ['getAll.workflow.json'],
		});
	});

	describe('boardItem:getByColumnValue - returns subitems and board relation data', () => {
		beforeAll(() => {
			nock(mondayApiUrl)
				.post('/v2/', (body: Record<string, unknown>) => {
					const query = body.query as string;
					return query.includes('items_page_by_column_values') && hasExpectedQueryStructure(body);
				})
				.reply(200, {
					data: {
						items_page_by_column_values: {
							cursor: null,
							items: [
								{
									...itemData,
									board: { id: '9876543210' },
								},
							],
						},
					},
				});
		});

		new NodeTestHarness().setupTests({
			workflowFiles: ['getByColumnValue.workflow.json'],
		});
	});

	describe('API version header', () => {
		beforeAll(() => {
			nock(mondayApiUrl)
				.post('/v2/', (body: Record<string, unknown>) => {
					const query = body.query as string;
					return query.includes('items (ids: $itemId)');
				})
				.matchHeader('API-Version', apiVersion)
				.reply(200, { data: { items: [itemData] } });
		});

		new NodeTestHarness().setupTests({
			workflowFiles: ['get.workflow.json'],
		});
	});

	describe('boardItem:get - throws when HTTP 200 returns errors without data', () => {
		beforeAll(() => {
			// Since 2025-01 failed requests return HTTP 200 with an `errors` array and
			// no data, so the node must surface them instead of returning empty output.
			nock(mondayApiUrl)
				.post('/v2/', (body: Record<string, unknown>) => {
					const query = body.query as string;
					return query.includes('items (ids: $itemId)');
				})
				.reply(200, {
					data: null,
					errors: [
						{
							message: 'User unauthorized to perform action',
							locations: [{ line: 2, column: 3 }],
							path: ['items'],
							extensions: {
								code: 'UserUnauthorizedException',
								error_data: {},
								status_code: 403,
							},
						},
					],
					account_id: 123456,
				});
		});

		new NodeTestHarness().setupTests({
			workflowFiles: ['getError.workflow.json'],
		});
	});

	describe('boardItem:get - returns partial data when HTTP 200 has both data and errors', () => {
		beforeAll(() => {
			// A query can return partial data alongside errors; the node must pass the
			// data through instead of throwing.
			nock(mondayApiUrl)
				.post('/v2/', (body: Record<string, unknown>) => {
					const query = body.query as string;
					return query.includes('items (ids: $itemId)') && hasExpectedQueryStructure(body);
				})
				.reply(200, {
					data: { items: [itemData] },
					errors: [
						{
							message: "Field 'mirror_col' threw an error",
							path: ['items', '0', 'column_values', '4'],
							extensions: { code: 'ColumnValueException', status_code: 200 },
						},
					],
				});
		});

		new NodeTestHarness().setupTests({
			workflowFiles: ['get.workflow.json'],
		});
	});

	describe('boardItem:getAll - cursor-based pagination with returnAll', () => {
		const secondItem = {
			...itemData,
			id: '9999999999',
			name: 'Second Item',
		};

		beforeAll(() => {
			// First request: items_page returns a cursor for more results
			nock(mondayApiUrl)
				.post('/v2/', (body: Record<string, unknown>) => {
					const query = body.query as string;
					return (
						query.includes('items_page') &&
						!query.includes('next_items_page') &&
						hasExpectedQueryStructure(body)
					);
				})
				.reply(200, {
					data: {
						boards: [
							{
								groups: [
									{
										id: 'group1',
										items_page: {
											cursor: 'cursor-page-2',
											items: [itemData],
										},
									},
								],
							},
						],
					},
				});

			// Second request: next_items_page follows the cursor
			nock(mondayApiUrl)
				.post('/v2/', (body: Record<string, unknown>) => {
					const query = body.query as string;
					const variables = body.variables as Record<string, unknown>;
					return query.includes('next_items_page') && variables.cursor === 'cursor-page-2';
				})
				.reply(200, {
					data: {
						next_items_page: {
							cursor: null,
							items: [secondItem],
						},
					},
				});
		});

		new NodeTestHarness().setupTests({
			workflowFiles: ['getAllPaginated.workflow.json'],
		});
	});
});
