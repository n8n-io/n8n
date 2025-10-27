import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	results: [
		{
			object: 'database',
			id: '138fb9cb-4cf0-804c-8663-d8ecdd5e692f',
			cover: null,
			icon: null,
			created_time: '2024-11-08T07:59:00.000Z',
			created_by: {
				object: 'user',
				id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
			},
			last_edited_by: {
				object: 'user',
				id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
			},
			last_edited_time: '2024-11-08T07:59:00.000Z',
			title: [
				{
					type: 'text',
					text: {
						content: 'TEST_DB',
						link: null,
					},
					annotations: {
						bold: false,
						italic: false,
						strikethrough: false,
						underline: false,
						code: false,
						color: 'default',
					},
					plain_text: 'TEST_DB',
					href: null,
				},
			],
			description: [],
			is_inline: false,
			properties: {
				Tags: {
					id: '%40~Tp',
					name: 'Tags',
					type: 'multi_select',
					multi_select: {
						options: [],
					},
				},
				Name: {
					id: 'title',
					name: 'Name',
					type: 'title',
					title: {},
				},
			},
			parent: {
				type: 'page_id',
				page_id: 'cc3d2b3c-f31a-4773-ab39-17a60c54567a',
			},
			url: 'https://www.notion.so/138fb9cb4cf0804c8663d8ecdd5e692f',
			public_url: null,
			archived: false,
			in_trash: false,
		},
		{
			object: 'database',
			id: 'f7216195-e0d4-46cd-a2d3-587a05baf472',
			cover: null,
			icon: null,
			created_time: '2022-03-07T11:25:00.000Z',
			created_by: {
				object: 'user',
				id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
			},
			last_edited_by: {
				object: 'user',
				id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
			},
			last_edited_time: '2024-11-08T07:54:00.000Z',
			title: [
				{
					type: 'text',
					text: {
						content: 'ListDatabase',
						link: null,
					},
					annotations: {
						bold: false,
						italic: false,
						strikethrough: false,
						underline: false,
						code: false,
						color: 'default',
					},
					plain_text: 'ListDatabase',
					href: null,
				},
			],
			description: [],
			is_inline: false,
			properties: {
				Email: {
					id: 'Fitu',
					name: 'Email',
					type: 'email',
					email: {},
				},
				'Last edited by': {
					id: 'XZ~H',
					name: 'Last edited by',
					type: 'last_edited_by',
					last_edited_by: {},
				},
				Tags: {
					id: 'a%7BRG',
					name: 'Tags',
					type: 'multi_select',
					multi_select: {
						options: [],
					},
				},
				Created: {
					id: 'eqq~',
					name: 'Created',
					type: 'created_time',
					created_time: {},
				},
				Status: {
					id: 'nZEQ',
					name: 'Status',
					type: 'status',
					status: {
						options: [
							{
								id: '70312bf9-84d5-40e6-b1eb-d71798ee556f',
								name: 'Not started',
								color: 'default',
								description: null,
							},
							{
								id: '02a6bb40-3f4b-47d6-818d-6a4129cc6091',
								name: 'In progress',
								color: 'gray',
								description: null,
							},
							{
								id: 'a3c13d01-63b2-4571-8a02-8c1801649af7',
								name: 'Done',
								color: 'green',
								description: null,
							},
						],
						groups: [
							{
								id: '82e2022c-001d-47ac-a8b8-243ef7fac352',
								name: 'To-do',
								color: 'gray',
								option_ids: ['70312bf9-84d5-40e6-b1eb-d71798ee556f'],
							},
							{
								id: '296000d7-287e-4121-9445-98fa8f7de298',
								name: 'In progress',
								color: 'blue',
								option_ids: ['02a6bb40-3f4b-47d6-818d-6a4129cc6091'],
							},
							{
								id: 'db7689ae-127d-4218-8b3c-306e59e02070',
								name: 'Complete',
								color: 'green',
								option_ids: ['a3c13d01-63b2-4571-8a02-8c1801649af7'],
							},
						],
					},
				},
				Name: {
					id: 'title',
					name: 'Name',
					type: 'title',
					title: {},
				},
			},
			parent: {
				type: 'page_id',
				page_id: 'cc3d2b3c-f31a-4773-ab39-17a60c54567a',
			},
			url: 'https://www.notion.so/f7216195e0d446cda2d3587a05baf472',
			public_url: 'https://pleasant-halloumi-63e.notion.site/f7216195e0d446cda2d3587a05baf472',
			archived: false,
			in_trash: false,
		},
		{
			object: 'database',
			id: 'e9c354e3-e506-4c42-83e2-d9c81a083f05',
			cover: null,
			icon: null,
			created_time: '2022-03-07T11:05:00.000Z',
			created_by: {
				object: 'user',
				id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
			},
			last_edited_by: {
				object: 'user',
				id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
			},
			last_edited_time: '2023-09-29T08:00:00.000Z',
			title: [
				{
					type: 'text',
					text: {
						content: 'n8n-trigger',
						link: null,
					},
					annotations: {
						bold: false,
						italic: false,
						strikethrough: false,
						underline: false,
						code: false,
						color: 'default',
					},
					plain_text: 'n8n-trigger',
					href: null,
				},
			],
			description: [],
			is_inline: false,
			properties: {
				Total: {
					id: 'A%3DdW',
					name: 'Total',
					type: 'formula',
					formula: {
						expression:
							'((({{notion:block_property:n%7DI%5E:00000000-0000-0000-0000-000000000000:fe91914e-2dc5-4510-82f8-399dd9b2daf8}} + {{notion:block_property:MH~%3B:00000000-0000-0000-0000-000000000000:fe91914e-2dc5-4510-82f8-399dd9b2daf8}}) - {{notion:block_property:MwMd:00000000-0000-0000-0000-000000000000:fe91914e-2dc5-4510-82f8-399dd9b2daf8}}) + {{notion:block_property:fJea:00000000-0000-0000-0000-000000000000:fe91914e-2dc5-4510-82f8-399dd9b2daf8}}) - {{notion:block_property:rSrM:00000000-0000-0000-0000-000000000000:fe91914e-2dc5-4510-82f8-399dd9b2daf8}}',
					},
				},
				'Total Incomes': {
					id: 'MH~%3B',
					name: 'Total Incomes',
					type: 'number',
					number: {
						format: 'number',
					},
				},
				'Total Expenses': {
					id: 'MwMd',
					name: 'Total Expenses',
					type: 'number',
					number: {
						format: 'number',
					},
				},
				'Created time': {
					id: 'Z%3BGM',
					name: 'Created time',
					type: 'created_time',
					created_time: {},
				},
				'Last edited time': {
					id: '%60%5ElG',
					name: 'Last edited time',
					type: 'last_edited_time',
					last_edited_time: {},
				},
				'Total Transfer-In': {
					id: 'fJea',
					name: 'Total Transfer-In',
					type: 'number',
					number: {
						format: 'number',
					},
				},
				'Starting Balance': {
					id: 'n%7DI%5E',
					name: 'Starting Balance',
					type: 'number',
					number: {
						format: 'number',
					},
				},
				'Total Transfer-Out': {
					id: 'rSrM',
					name: 'Total Transfer-Out',
					type: 'number',
					number: {
						format: 'number',
					},
				},
				Name: {
					id: 'title',
					name: 'Name',
					type: 'title',
					title: {},
				},
			},
			parent: {
				type: 'page_id',
				page_id: 'cc3d2b3c-f31a-4773-ab39-17a60c54567a',
			},
			url: 'https://www.notion.so/e9c354e3e5064c4283e2d9c81a083f05',
			public_url: null,
			archived: false,
			in_trash: false,
		},
	],
	has_more: false,
};

describe('Test NotionV2, database => getAll', () => {
	nock('https://api.notion.com')
		.post('/v1/search', { filter: { property: 'object', value: 'database' } })
		.reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAll.workflow.json'],
	});
});
