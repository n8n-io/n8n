import {
	IDisplayOptions,
	INodeProperties,
} from 'n8n-workflow';

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

const annotation = [
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
				description: 'Whether the text is bolded.',
			},
			{
				displayName: 'Italic',
				name: 'italic',
				type: 'boolean',
				default: false,
				description: 'Whether the text is italicized.',
			},
			{
				displayName: 'Strikethrough',
				name: 'strikethrough',
				type: 'boolean',
				default: false,
				description: 'Whether the text is struck through.',
			},
			{
				displayName: 'Underline',
				name: 'underline',
				type: 'boolean',
				default: false,
				description: 'Whether the text is underlined.',
			},
			{
				displayName: 'Code',
				name: 'code',
				type: 'boolean',
				default: false,
				description: 'Whether the text is code style.',
			},
			{
				displayName: 'Color',
				name: 'color',
				type: 'options',
				options: colors,
				default: '',
				description: 'Color of the text.',
			},
		],
		description: 'All annotations that apply to this rich text.',
	},
] as INodeProperties[];

const typeMention = [
	{
		displayName: 'Type',
		name: 'mentionType',
		type: 'options',
		displayOptions: {
			show: {
				textType: [
					'mention',
				],
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
		description: `An inline mention of a user, page, database, or date. In the app these are</br>
		created by typing @ followed by the name of a user, page, database, or a date.`,
	},
	{
		displayName: 'User ID',
		name: 'user',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getUsers',
		},
		displayOptions: {
			show: {
				mentionType: [
					'user',
				],
			},
		},
		default: '',
		description: 'The id of the user being mentioned.',
	},
	{
		displayName: 'Page ID',
		name: 'page',
		type: 'string',
		displayOptions: {
			show: {
				mentionType: [
					'page',
				],
			},
		},
		default: '',
		description: 'The id of the page being mentioned.',
	},
	{
		displayName: 'Database ID',
		name: 'database',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDatabases',
		},
		displayOptions: {
			show: {
				mentionType: [
					'database',
				],
			},
		},
		default: '',
		description: 'The id of the database being mentioned.',
	},
	{
		displayName: 'Range',
		name: 'range',
		displayOptions: {
			show: {
				mentionType: [
					'date',
				],
			},
		},
		type: 'boolean',
		default: false,
		description: 'Weather or not you want to define a date range.',
	},
	{
		displayName: 'Date',
		name: 'date',
		displayOptions: {
			show: {
				mentionType: [
					'date',
				],
				range: [
					false,
				],
			},
		},
		type: 'dateTime',
		default: '',
		description: 'An ISO 8601 format date, with optional time.',
	},
	{
		displayName: 'Date Start',
		name: 'dateStart',
		displayOptions: {
			show: {
				mentionType: [
					'date',
				],
				range: [
					true,
				],
			},
		},
		type: 'dateTime',
		default: '',
		description: 'An ISO 8601 format date, with optional time.',
	},
	{
		displayName: 'Date End',
		name: 'dateEnd',
		displayOptions: {
			show: {
				range: [
					true,
				],
				mentionType: [
					'date',
				],
			},
		},
		type: 'dateTime',
		default: '',
		description: `An ISO 8601 formatted date, with optional time. Represents the end of a date range.`,
	},
] as INodeProperties[];

const typeEquation = [
	{
		displayName: 'Expression',
		name: 'expression',
		type: 'string',
		displayOptions: {
			show: {
				textType: [
					'equation',
				],
			},
		},
		default: '',
		description: '',
	},
] as INodeProperties[];

const typeText = [
	{
		displayName: 'Text',
		name: 'text',
		displayOptions: {
			show: {
				textType: [
					'text',
				],
			},
		},
		type: 'string',
		default: '',
		description: `Text content. This field contains the actual content</br>
		of your text and is probably the field you'll use most often.`,
	},
	{
		displayName: 'Is Link',
		name: 'isLink',
		displayOptions: {
			show: {
				textType: [
					'text',
				],
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
				textType: [
					'text',
				],
				isLink: [
					true,
				],
			},
		},
		type: 'string',
		default: '',
		description: 'The URL that this link points to.',
	},
] as INodeProperties[];

export const text = (displayOptions: IDisplayOptions) => [
	{
		displayName: 'Text',
		name: 'text',
		placeholder: 'Add Text',
		type: 'fixedCollection',
		default: '',
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
						description: '',
					},
					...typeText,
					...typeMention,
					...typeEquation,

					...annotation,
				],
			},
		],
		description: 'Rich text in the block.',
	}] as INodeProperties[];


const todo = (type: string) => [{
	displayName: 'Checked',
	name: 'checked',
	type: 'boolean',
	default: false,
	displayOptions: {
		show: {
			type: [
				type,
			],
		},
	},
	description: 'Whether the to_do is checked or not.',
}] as INodeProperties[];

const title = (type: string) => [{
	displayName: 'Title',
	name: 'title',
	type: 'string',
	default: '',
	displayOptions: {
		show: {
			type: [
				type,
			],
		},
	},
	description: 'Plain text of page title.',
}] as INodeProperties[];

const richText = (displayOptions: IDisplayOptions) => [
	{
		displayName: 'Rich Text',
		name: 'richText',
		type: 'boolean',
		displayOptions,
		default: false,
	},
] as INodeProperties[];

const textContent = (displayOptions: IDisplayOptions) => [
	{
		displayName: 'Text',
		name: 'textContent',
		type: 'string',
		displayOptions,
		default: '',
	},
] as INodeProperties[];

const block = (blockType: string) => {
	const data: INodeProperties[] = [];
	switch (blockType) {
		case 'to_do':
			data.push(...todo(blockType));
			data.push(...richText({
				show: {
					type: [
						blockType,
					],
				},
			}));
			data.push(...textContent({
				show: {
					type: [
						blockType,
					],
					richText: [
						false,
					],
				},
			}));
			data.push(...text({
				show: {
					type: [
						blockType,
					],
					richText: [
						true,
					],
				},
			}));
			break;
		case 'child_page':
			data.push(...title(blockType));
			break;
		default:
			data.push(...richText({
				show: {
					type: [
						blockType,
					],
				},
			}));
			data.push(...textContent({
				show: {
					type: [
						blockType,
					],
					richText: [
						false,
					],
				},
			}));
			data.push(...text({
				show: {
					type: [
						blockType,
					],
					richText: [
						true,
					],
				},
			}));
			break;
	}
	return data;
};

export const blocks = (resource: string, operation: string) => [{
	displayName: 'Blocks',
	name: 'blockUi',
	type: 'fixedCollection',
	typeOptions: {
		multipleValues: true,
	},
	default: '',
	displayOptions: {
		show: {
			resource: [
				resource,
			],
			operation: [
				operation,
			],
		},
	},
	placeholder: 'Add Block',
	options: [
		{
			name: 'blockValues',
			displayName: 'Block',
			values: [
				{
					displayName: 'Type',
					name: 'type',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getBlockTypes',
					},
					description: 'Type of block',
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
] as INodeProperties[];

