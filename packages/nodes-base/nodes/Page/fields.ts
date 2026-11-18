import type { INodeProperties } from 'n8n-workflow';

export const PAGE_ID_FIELD = 'pageId';
export const CONTENT_FIELD = 'content';
export const SECTION_FIELD = 'section';

export const PAGE_OPERATIONS = ['append', 'get', 'replace', 'updateSection'] as const;

export type PageOperation = (typeof PAGE_OPERATIONS)[number];

/** Reads the page id from the address of a page, in its short form or inside a project. */
const PAGE_URL_ID_REGEX = '/pages?/([a-zA-Z0-9_-]+)';

export const pageProperties: INodeProperties[] = [
	{
		displayName: 'Resource',
		name: 'resource',
		type: 'options',
		noDataExpression: true,
		options: [{ name: 'Page', value: 'page' }],
		default: 'page',
	},
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Append',
				value: 'append',
				description: 'Add text to the end of a page',
				action: 'Append to a page',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get the content of a page',
				action: 'Get a page',
			},
			{
				name: 'Replace Content',
				value: 'replace',
				description: 'Replace the whole content of a page',
				action: 'Replace the content of a page',
			},
			{
				name: 'Update Section',
				value: 'updateSection',
				description: 'Replace the text under a heading of a page',
				action: 'Update a section of a page',
			},
		],
		default: 'append',
	},
	{
		displayName: 'Page',
		name: PAGE_ID_FIELD,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		description: 'A page of the project that owns this workflow',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				typeOptions: {
					searchListMethod: 'pageSearch',
					searchable: true,
				},
			},
			{
				displayName: 'By URL',
				name: 'url',
				type: 'string',
				placeholder: 'e.g. https://n8n.example.com/page/abc123',
				extractValue: {
					type: 'regex',
					regex: PAGE_URL_ID_REGEX,
				},
				validation: [
					{
						type: 'regex',
						properties: {
							regex: PAGE_URL_ID_REGEX,
							errorMessage: 'Not a valid page URL',
						},
					},
				],
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
			},
		],
	},
	{
		displayName: 'Section',
		name: SECTION_FIELD,
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. Latest report',
		description:
			'The title of the heading whose text to replace. A page with no such heading gets a new section at its end.',
		displayOptions: { show: { operation: ['updateSection'] } },
	},
	{
		displayName: 'Content',
		name: CONTENT_FIELD,
		type: 'string',
		typeOptions: { rows: 5 },
		default: '',
		required: true,
		description: 'The text to write, in Markdown',
		displayOptions: { show: { operation: ['append', 'replace', 'updateSection'] } },
	},
];
