import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	object: 'list',
	results: [
		{
			object: 'block',
			id: '15bfb9cb-4cf0-8162-bd53-fc201157675f',
			parent: {
				type: 'block_id',
				block_id: '90e03468-f8aa-4576-95da-02ccad963040',
			},
			created_time: '2024-12-13T03:40:00.000Z',
			last_edited_time: '2024-12-13T03:40:00.000Z',
			created_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			last_edited_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
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
							content: 'new text',
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
						plain_text: 'new text',
						href: null,
					},
				],
			},
		},
		{
			object: 'block',
			id: '15bfb9cb-4cf0-8104-8d3f-c8ca8919e791',
			parent: {
				type: 'block_id',
				block_id: '90e03468-f8aa-4576-95da-02ccad963040',
			},
			created_time: '2024-12-13T03:40:00.000Z',
			last_edited_time: '2024-12-13T03:40:00.000Z',
			created_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			last_edited_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			has_children: false,
			archived: false,
			in_trash: false,
			type: 'heading_1',
			heading_1: {
				is_toggleable: false,
				color: 'default',
				text: [
					{
						type: 'text',
						text: {
							content: 'h1',
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
						plain_text: 'h1',
						href: null,
					},
				],
			},
		},
		{
			object: 'block',
			id: '15bfb9cb-4cf0-814d-b4ad-f65a2c558bb9',
			parent: {
				type: 'block_id',
				block_id: '90e03468-f8aa-4576-95da-02ccad963040',
			},
			created_time: '2024-12-13T03:40:00.000Z',
			last_edited_time: '2024-12-13T03:40:00.000Z',
			created_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			last_edited_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
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
							content: 'h2',
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
						plain_text: 'h2',
						href: null,
					},
				],
			},
		},
		{
			object: 'block',
			id: '15bfb9cb-4cf0-8135-9e43-f3f8a21e2e86',
			parent: {
				type: 'block_id',
				block_id: '90e03468-f8aa-4576-95da-02ccad963040',
			},
			created_time: '2024-12-13T03:40:00.000Z',
			last_edited_time: '2024-12-13T03:40:00.000Z',
			created_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			last_edited_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			has_children: false,
			archived: false,
			in_trash: false,
			type: 'heading_3',
			heading_3: {
				is_toggleable: false,
				color: 'default',
				text: [
					{
						type: 'text',
						text: {
							content: 'h3',
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
						plain_text: 'h3',
						href: null,
					},
				],
			},
		},
		{
			object: 'block',
			id: '15bfb9cb-4cf0-816b-9457-efba183a957c',
			parent: {
				type: 'block_id',
				block_id: '90e03468-f8aa-4576-95da-02ccad963040',
			},
			created_time: '2024-12-13T03:40:00.000Z',
			last_edited_time: '2024-12-13T03:40:00.000Z',
			created_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			last_edited_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			has_children: false,
			archived: false,
			in_trash: false,
			type: 'toggle',
			toggle: {
				color: 'default',
				text: [
					{
						type: 'text',
						text: {
							content: 'toggle',
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
						plain_text: 'toggle',
						href: null,
					},
				],
			},
		},
		{
			object: 'block',
			id: '15bfb9cb-4cf0-814f-9928-ed87ed0d9470',
			parent: {
				type: 'block_id',
				block_id: '90e03468-f8aa-4576-95da-02ccad963040',
			},
			created_time: '2024-12-13T03:40:00.000Z',
			last_edited_time: '2024-12-13T03:40:00.000Z',
			created_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			last_edited_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			has_children: false,
			archived: false,
			in_trash: false,
			type: 'to_do',
			to_do: {
				checked: false,
				color: 'default',
				text: [
					{
						type: 'text',
						text: {
							content: 'todo',
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
						plain_text: 'todo',
						href: null,
					},
				],
			},
		},
		{
			object: 'block',
			id: '15bfb9cb-4cf0-812d-95e9-dc8ddc3153dd',
			parent: {
				type: 'block_id',
				block_id: '90e03468-f8aa-4576-95da-02ccad963040',
			},
			created_time: '2024-12-13T03:40:00.000Z',
			last_edited_time: '2024-12-13T03:40:00.000Z',
			created_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			last_edited_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			has_children: false,
			archived: false,
			in_trash: false,
			type: 'bulleted_list_item',
			bulleted_list_item: {
				color: 'default',
				text: [
					{
						type: 'text',
						text: {
							content: 'bullet 1',
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
						plain_text: 'bullet 1',
						href: null,
					},
				],
			},
		},
		{
			object: 'block',
			id: '15bfb9cb-4cf0-8106-9a25-d3859984ce34',
			parent: {
				type: 'block_id',
				block_id: '90e03468-f8aa-4576-95da-02ccad963040',
			},
			created_time: '2024-12-13T03:40:00.000Z',
			last_edited_time: '2024-12-13T03:40:00.000Z',
			created_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			last_edited_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			has_children: false,
			archived: false,
			in_trash: false,
			type: 'numbered_list_item',
			numbered_list_item: {
				color: 'default',
				text: [
					{
						type: 'text',
						text: {
							content: 'point 1',
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
						plain_text: 'point 1',
						href: null,
					},
				],
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
			last_edited_time: '2024-12-13T03:40:00.000Z',
			created_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
			},
			last_edited_by: {
				object: 'user',
				id: 'f215e49c-4677-40c0-9adc-87440d341324',
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
	next_cursor: null,
	has_more: false,
	request_id: '33358f1b-fc4d-4387-8d95-43c7d03519a5',
};

describe('Test NotionV2, block => append', () => {
	nock('https://api.notion.com')
		.patch('/v1/blocks/90e03468f8aa457695da02ccad963040/children')
		.reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['append.workflow.json'],
	});
});
