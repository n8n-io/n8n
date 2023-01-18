import { IDisplayOptions, INodeProperties } from 'n8n-workflow';

const colors = [
	{
		name: 'Default',
		value: 'default',
	},
	{
		name: 'Gray',
		value: 'gray',
	},
	{
		name: 'Brown',
		value: 'brown',
	},
	{
		name: 'Orange',
		value: 'orange',
	},
	{
		name: 'Yellow',
		value: 'yellow',
	},
	{
		name: 'Green',
		value: 'green',
	},
	{
		name: 'Blue',
		value: 'blue',
	},
	{
		name: 'Purple',
		value: 'purple',
	},
	{
		name: 'Pink',
		value: 'pink',
	},
	{
		name: 'Red',
		value: 'red',
	},
	{
		name: 'Gray Background',
		value: 'gray_background',
	},
	{
		name: 'Brown Background',
		value: 'brown_background',
	},
	{
		name: 'Orange Background',
		value: 'orange_background',
	},
	{
		name: 'Yellow Background',
		value: 'yellow_background',
	},
	{
		name: 'Green Background',
		value: 'green_background',
	},
	{
		name: 'Blue Background',
		value: 'blue_background',
	},
	{
		name: 'Purple Background',
		value: 'purple_background',
	},
	{
		name: 'Pink Background',
		value: 'pink_background',
	},
	{
		name: 'Red Background',
		value: 'red_background',
	},
];

const annotation: INodeProperties[] = [
	{
		displayName: 'Annotations',
		name: 'annotationUi',
		type: 'collection',
		placeholder: 'Add Annotation',
		default: {},
		options: [
			{
				displayName: 'Bold',
				name: 'bold',
				type: 'boolean',
				default: false,
				description: 'Whether the text is bolded',
			},
			{
				displayName: 'Italic',
				name: 'italic',
				type: 'boolean',
				default: false,
				description: 'Whether the text is italicized',
			},
			{
				displayName: 'Strikethrough',
				name: 'strikethrough',
				type: 'boolean',
				default: false,
				description: 'Whether the text is struck through',
			},
			{
				displayName: 'Underline',
				name: 'underline',
				type: 'boolean',
				default: false,
				description: 'Whether the text is underlined',
			},
			{
				displayName: 'Code',
				name: 'code',
				type: 'boolean',
				default: false,
				description: 'Whether the text is code style',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'options',
				options: colors,
				default: '',
				description: 'Color of the text',
			},
		],
		description: 'All annotations that apply to this rich text',
	},
];

const typeMention: INodeProperties[] = [
	{
		displayName: 'Type',
		name: 'mentionType',
		type: 'options',
		displayOptions: {
			show: {
				textType: ['mention'],
			},
		},
		options: [
			{
				name: 'Database',
				value: 'database',
			},
			{
				name: 'Date',
				value: 'date',
			},
			{
				name: 'Page',
				value: 'page',
			},
			{
				name: 'User',
				value: 'user',
			},
		],
		default: '',
		description:
			'An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.',
	},
	{
		displayName: 'User Name or ID',
		name: 'user',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		displayOptions: {
			show: {
				mentionType: ['user'],
			},
		},
		default: '',
		description:
			'The ID of the user being mentioned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Page ID',
		name: 'page',
		type: 'string',
		displayOptions: {
			show: {
				mentionType: ['page'],
			},
		},
		default: '',
		description: 'The ID of the page being mentioned',
	},
	{
		displayName: 'Database',
		name: 'database',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		modes: [
			{
				displayName: 'Database',
				name: 'list',
				type: 'list',
				placeholder: 'Select a Database...',
				typeOptions: {
					searchListMethod: 'getDatabases',
					searchable: true,
				},
			},
			{
				displayName: 'Link',
				name: 'url',
				type: 'string',
				placeholder:
					'https://www.notion.so/0fe2f7de558b471eab07e9d871cdf4a9?v=f2d424ba0c404733a3f500c78c881610',
				validation: [
					{
						type: 'regex',
						properties: {
							regex:
								'(?:https|http)://www.notion.so/(?:[a-z0-9-]{2,}/)?([0-9a-f]{8}[0-9a-f]{4}4[0-9a-f]{3}[89ab][0-9a-f]{3}[0-9a-f]{12}).*',
							errorMessage: 'Not a valid Notion Database URL',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex:
						'(?:https|http)://www.notion.so/(?:[a-z0-9-]{2,}/)?([0-9a-f]{8}[0-9a-f]{4}4[0-9a-f]{3}[89ab][0-9a-f]{3}[0-9a-f]{12})',
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: 'ab1545b247fb49fa92d6f4b49f4d8116',
				validation: [
					{
						type: 'regex',
						properties: {
							regex:
								'^(([0-9a-f]{8}[0-9a-f]{4}4[0-9a-f]{3}[89ab][0-9a-f]{3}[0-9a-f]{12})|([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}))[ \t]*',
							errorMessage: 'Not a valid Notion Database ID',
						},
					},
				],
				extractValue: {
					type: 'regex',
					regex: '^([0-9a-f]{8}-?[0-9a-f]{4}-?4[0-9a-f]{3}-?[89ab][0-9a-f]{3}-?[0-9a-f]{12})',
				},
				url: '=https://www.notion.so/{{$value.replace(/-/g, "")}}',
			},
		],
		displayOptions: {
			show: {
				mentionType: ['database'],
			},
		},
		description: 'The Notion Database being mentioned',
	},
	{
		displayName: 'Range',
		name: 'range',
		displayOptions: {
			show: {
				mentionType: ['date'],
			},
		},
		type: 'boolean',
		default: false,
		description: 'Whether or not you want to define a date range',
	},
	{
		displayName: 'Date',
		name: 'date',
		displayOptions: {
			show: {
				mentionType: ['date'],
				range: [false],
			},
		},
		type: 'dateTime',
		default: '',
		description: 'An ISO 8601 format date, with optional time',
	},
	{
		displayName: 'Date Start',
		name: 'dateStart',
		displayOptions: {
			show: {
				mentionType: ['date'],
				range: [true],
			},
		},
		type: 'dateTime',
		default: '',
		description: 'An ISO 8601 format date, with optional time',
	},
	{
		displayName: 'Date End',
		name: 'dateEnd',
		displayOptions: {
			show: {
				range: [true],
				mentionType: ['date'],
			},
		},
		type: 'dateTime',
		default: '',
		description:
			'An ISO 8601 formatted date, with optional time. Represents the end of a date range.',
	},
];

const typeEquation: INodeProperties[] = [
	{
		displayName: 'Expression',
		name: 'expression',
		type: 'string',
		displayOptions: {
			show: {
				textType: ['equation'],
			},
		},
		default: '',
	},
];

const typeText: INodeProperties[] = [
	{
		displayName: 'Text',
		name: 'text',
		displayOptions: {
			show: {
				textType: ['text'],
			},
		},
		type: 'string',
		default: '',
		description:
			"Text content. This field contains the actual content of your text and is probably the field you'll use most often.",
	},
	{
		displayName: 'Is Link',
		name: 'isLink',
		displayOptions: {
			show: {
				textType: ['text'],
			},
		},
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Text Link',
		name: 'textLink',
		displayOptions: {
			show: {
				textType: ['text'],
				isLink: [true],
			},
		},
		type: 'string',
		default: '',
		description: 'The URL that this link points to',
	},
];

export const text = (displayOptions: IDisplayOptions): INodeProperties[] =>
	[
		{
			displayName: 'Text',
			name: 'text',
			placeholder: 'Add Text',
			type: 'fixedCollection',
			default: {},
			typeOptions: {
				multipleValues: true,
			},
			displayOptions,
			options: [
				{
					name: 'text',
					displayName: 'Text',
					values: [
						{
							displayName: 'Type',
							name: 'textType',
							type: 'options',
							options: [
								{
									name: 'Equation',
									value: 'equation',
								},
								{
									name: 'Mention',
									value: 'mention',
								},
								{
									name: 'Text',
									value: 'text',
								},
							],
							default: 'text',
						},
						...typeText,
						...typeMention,
						...typeEquation,

						...annotation,
					],
				},
			],
			description: 'Rich text in the block',
		},
	] as INodeProperties[];

const todo = (type: string): INodeProperties[] =>
	[
		{
			displayName: 'Checked',
			name: 'checked',
			type: 'boolean',
			default: false,
			displayOptions: {
				show: {
					type: [type],
				},
			},
			description: 'Whether the to_do is checked or not',
		},
	] as INodeProperties[];

const title = (type: string): INodeProperties[] =>
	[
		{
			displayName: 'Title',
			name: 'title',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					type: [type],
				},
			},
			description: 'Plain text of page title',
		},
	] as INodeProperties[];

const richText = (displayOptions: IDisplayOptions): INodeProperties[] => [
	{
		displayName: 'Rich Text',
		name: 'richText',
		type: 'boolean',
		displayOptions,
		default: false,
	},
];

const textContent = (displayOptions: IDisplayOptions): INodeProperties[] => [
	{
		displayName: 'Text',
		name: 'textContent',
		type: 'string',
		displayOptions,
		default: '',
	},
];

const block = (blockType: string): INodeProperties[] => {
	const data: INodeProperties[] = [];
	switch (blockType) {
		case 'to_do':
			data.push(...todo(blockType));
			data.push(
				...richText({
					show: {
						type: [blockType],
					},
				}),
			);
			data.push(
				...textContent({
					show: {
						type: [blockType],
						richText: [false],
					},
				}),
			);
			data.push(
				...text({
					show: {
						type: [blockType],
						richText: [true],
					},
				}),
			);
			break;
		case 'child_page':
			data.push(...title(blockType));
			break;
		default:
			data.push(
				...richText({
					show: {
						type: [blockType],
					},
				}),
			);
			data.push(
				...textContent({
					show: {
						type: [blockType],
						richText: [false],
					},
				}),
			);
			data.push(
				...text({
					show: {
						type: [blockType],
						richText: [true],
					},
				}),
			);
			break;
	}
	return data;
};

export const blocks = (resource: string, operation: string): INodeProperties[] => [
	{
		displayName: 'Blocks',
		name: 'blockUi',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		default: {},
		displayOptions: {
			show: {
				resource: [resource],
				operation: [operation],
			},
		},
		placeholder: 'Add Block',
		options: [
			{
				name: 'blockValues',
				displayName: 'Block',
				values: [
					{
						displayName: 'Type Name or ID',
						name: 'type',
						type: 'options',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
						typeOptions: {
							loadOptionsMethod: 'getBlockTypes',
						},
						default: 'paragraph',
					},
					...block('paragraph'),
					...block('heading_1'),
					...block('heading_2'),
					...block('heading_3'),
					...block('toggle'),
					...block('to_do'),
					...block('child_page'),
					...block('bulleted_list_item'),
					...block('numbered_list_item'),
				],
			},
		],
	},
];
