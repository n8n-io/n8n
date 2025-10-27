import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	results: [
		{
			object: 'block',
			id: 'b14bdaaf-b7e9-48c9-a7fa-1b9e1e2092ae',
			parent: {
				type: 'block_id',
				block_id: '90e03468-f8aa-4576-95da-02ccad963040',
			},
			created_time: '2023-11-23T10:42:00.000Z',
			last_edited_time: '2024-12-13T03:35:00.000Z',
			created_by: {
				object: 'user',
				id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
			},
			last_edited_by: {
				object: 'user',
				id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
			},
			has_children: true,
			archived: false,
			in_trash: false,
			type: 'toggle',
			toggle: {
				color: 'default',
				text: [
					{
						type: 'text',
						text: {
							content: 'Drop down First',
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
						plain_text: 'Drop down First',
						href: null,
					},
				],
			},
		},
		{
			object: 'block',
			id: 'de572f5d-ff5c-4c13-a879-efc20fe47db0',
			parent: {
				type: 'block_id',
				block_id: '90e03468-f8aa-4576-95da-02ccad963040',
			},
			created_time: '2023-11-23T10:42:00.000Z',
			last_edited_time: '2024-03-11T12:39:00.000Z',
			created_by: {
				object: 'user',
				id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
			},
			last_edited_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			has_children: true,
			archived: false,
			in_trash: false,
			type: 'bulleted_list_item',
			bulleted_list_item: {
				color: 'default',
				text: [
					{
						type: 'text',
						text: {
							content: 'Bullet Point Second',
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
						plain_text: 'Bullet Point Second',
						href: null,
					},
				],
			},
		},
		{
			object: 'block',
			id: 'c98cf981-c967-47f5-9948-4aa1be9ce9d0',
			parent: {
				type: 'block_id',
				block_id: '90e03468-f8aa-4576-95da-02ccad963040',
			},
			created_time: '2023-11-24T04:41:00.000Z',
			last_edited_time: '2024-12-13T03:35:00.000Z',
			created_by: {
				object: 'user',
				id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
			},
			last_edited_by: {
				object: 'user',
				id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
			},
			has_children: false,
			archived: false,
			in_trash: false,
			type: 'heading_2',
			heading_2: {
				is_toggleable: false,
				color: 'default',
				text: [
					{
						type: 'text',
						text: {
							content: 'Hello World',
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
						plain_text: 'Hello World',
						href: null,
					},
				],
			},
		},
		{
			object: 'block',
			id: '527a0555-a486-401e-93a8-19819615c132',
			parent: {
				type: 'block_id',
				block_id: '90e03468-f8aa-4576-95da-02ccad963040',
			},
			created_time: '2023-11-23T10:42:00.000Z',
			last_edited_time: '2023-11-23T10:43:00.000Z',
			created_by: {
				object: 'user',
				id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
			},
			last_edited_by: {
				object: 'user',
				id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
			},
			has_children: false,
			archived: false,
			in_trash: false,
			type: 'child_page',
			child_page: {
				title: 'Page Third',
			},
		},
		{
			object: 'block',
			id: '15bfb9cb-4cf0-81b1-a6f1-eac377c4d163',
			parent: {
				type: 'block_id',
				block_id: '90e03468-f8aa-4576-95da-02ccad963040',
			},
			created_time: '2024-12-13T03:40:00.000Z',
			last_edited_time: '2024-12-13T06:15:00.000Z',
			created_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			last_edited_by: {
				object: 'user',
				id: '88f72c1a-07ed-4bae-9fa0-231365d813d9',
			},
			has_children: false,
			archived: false,
			in_trash: false,
			type: 'paragraph',
			paragraph: {
				color: 'default',
				text: [
					{
						type: 'text',
						text: {
							content: '',
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
						plain_text: '',
						href: null,
					},
				],
			},
		},
	],
	has_more: false,
};

describe('Test NotionV2, block => getAll', () => {
	nock('https://api.notion.com')
		.get('/v1/blocks/90e03468f8aa457695da02ccad963040/children')
		.reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['getAll.workflow.json'],
	});
});
