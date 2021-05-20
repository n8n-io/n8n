import {
	INodeProperties,
} from 'n8n-workflow';

export const documentOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'document',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
			},
			{
				name: 'Get',
				value: 'get',
			},
			{
				name: 'Update',
				value: 'update',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const documentFields = [
	/* -------------------------------------------------------------------------- */
	/*                                 document:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'create',
				],
				resource: [
					'document',
				],
			},
		},
	},

	/* -------------------------------------------------------------------------- */
	/*                                 document:get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Document ID',
		name: 'documentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'get',
				],
				resource: [
					'document',
				],
			},
		},
		default: '',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 document:update                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Document ID',
		name: 'documentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'document',
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				operation: [
					'update',
				],
				resource: [
					'document',
				],
			},
		},
		options: [
			{
				displayName: 'Requests',
				name: 'requestsUi',
				description: 'Requests to update a document.',
				type: 'fixedCollection',
				default: '',
				placeholder: 'Add Request',
				typeOptions: {
					multipleValues: true,
				},
				options: [
					{
						name: 'createFooterValues',
						displayName: 'Create Footer',
						values: [
							{
								displayName: 'Segment ID',
								name: 'segmentId',
								type: 'string',
								description: 'The ID of the header, footer or footnote the location is in. An empty segment ID signifies the document\'s body.',
								default: '',
							},
							{
								displayName: 'Index',
								name: 'index',
								type: 'number',
								description: 'The zero-based index, relative to the beginning of the specified segment.',
								default: 0,
							},
						],
					},
					{
						name: 'createHeaderValues',
						displayName: 'Create Header',
						values: [
							{
								displayName: 'Segment ID',
								name: 'segmentId',
								type: 'string',
								description: 'The ID of the header, footer or footnote the location is in. An empty segment ID signifies the document\'s body.',
								default: '',
							},
							{
								displayName: 'Index',
								name: 'index',
								type: 'number',
								description: 'The zero-based index, relative to the beginning of the specified segment.',
								default: 0,
							},
						],
					},
					{
						name: 'createNamedRangeValues',
						displayName: 'Create Named Range',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								description: 'The name of the Named Range. Names do not need to be unique.',
								default: '',
							},
							{
								displayName: 'Segment ID',
								name: 'segmentId',
								type: 'string',
								description: 'The ID of the header, footer or footnote that this range is contained in. An empty segment ID signifies the document\'s body.',
								default: '',
							},
							{
								displayName: 'Start Index',
								name: 'startIndex',
								type: 'number',
								description: 'The zero-based start index of this range.',
								default: 0,
							},
							{
								displayName: 'End Index',
								name: 'endIndex',
								type: 'number',
								description: 'The zero-based end index of this range.',
								default: 0,
							},
						],
					},
					{
						name: 'createParagraphBulletsValues',
						displayName: 'Create Paragraph Bullets Style',
						values: [
							{
								displayName: 'Bullet Preset',
								name: 'bulletPreset',
								type: 'options',
								options: [
									{
										name: 'Bullet Glyphs: Disc, Circle, Square',
										value: 'BULLET_DISC_CIRCLE_SQUARE',
										description: 'A bulleted list with a <code>DISC</code>, <code>CIRCLE</code> and <code>SQUARE</code> bullet glyph for the first 3 list nesting levels.',
									},
									{
										name: 'Bullet Glyphs: Diamond X, Arrow 3d, Square',
										value: 'BULLET_DIAMONDX_ARROW3D_SQUARE',
										description: 'A bulleted list with a <code>DIAMONDX</code>, <code>ARROW3D</code> and <code>SQUARE</code> bullet glyph for the first 3 list nesting levels.',
									},
									{
										name: 'Bullet Glyph: Checkbox',
										value: 'BULLET_CHECKBOX',
										description: 'A bulleted list with CHECKBOX bullet glyphs for all list nesting levels.',
									},
									{
										name: 'Bullet Glyphs: Arrow, Diamond, Disc',
										value: 'BULLET_ARROW_DIAMOND_DISC',
										description: 'A bulleted list with a <code>ARROW</code>, <code>DIAMOND</code> and <code>DISC</code> bullet glyph for the first 3 list nesting levels.',
									},
									{
										name: 'Bullet Glyphs: Star, Circle, Square',
										value: 'BULLET_STAR_CIRCLE_SQUARE',
										description: 'A bulleted list with a <code>STAR</code>, <code>CIRCLE</code> and <code>SQUARE</code> bullet glyph for the first 3 list nesting levels.',
									},
									{
										name: 'Bullet Glyphs: Arrow 3d, Circle, Square',
										value: 'BULLET_ARROW3D_CIRCLE_SQUARE',
										description: 'A bulleted list with a <code>ARROW3D</code>, <code>CIRCLE</code> and <code>SQUARE</code> bullet glyph for the first 3 list nesting levels.',
									},
									{
										name: 'Bullet Glyphs: Left Triangle, Diamond, Disc',
										value: 'BULLET_LEFTTRIANGLE_DIAMOND_DISC',
										description: 'A bulleted list with a <code>LEFTTRIANGLE</code>, <code>DIAMOND</code> and <code>DISC</code> bullet glyph for the first 3 list nesting levels.',
									},
									{
										name: 'Bullet Glyphs: Diamond X, Hollow Diamond, Square',
										value: 'BULLET_DIAMONDX_HOLLOWDIAMOND_SQUARE',
										description: 'A bulleted list with a <code>DIAMONDX</code>, <code>HOLLOWDIAMOND</code> and <code>SQUARE</code> bullet glyph for the first 3 list nesting levels.',
									},
									{
										name: 'Bullet Glyphs: Diamond, Circle, Square',
										value: 'BULLET_DIAMOND_CIRCLE_SQUARE',
										description: 'A bulleted list with a <cpde>DIAMOND</code>, <code>CIRCLE</code> and <code>SQUARE</code> bullet glyph for the first 3 list nesting levels.',
									},
									{
										name: 'Numbered Decimal: Alphabetic, Roman',
										value: 'NUMBERED_DECIMAL_ALPHA_ROMAN',
										description: 'An ordered list with <code>DECIMAL</code>, <code>ALPHA</code> and <code>ROMAN</code> numeric glyphs for the first 3 list nesting levels, followed by periods.',
									},
									{
										name: 'Numbered Decimal: Alphabetic, Roman, Parens',
										value: 'NUMBERED_DECIMAL_ALPHA_ROMAN_PARENS',
										description: 'An ordered list with <code>DECIMAL</code>, <code>ALPHA</code> and <code>ROMAN</code> numeric glyphs for the first 3 list nesting levels, followed by parenthesis.',
									},
									{
										name: 'Numbered Decimal: Nested',
										value: 'NUMBERED_DECIMAL_NESTED',
										description: 'A numbered list with <code>DECIMAL</code> numeric glyphs separated by periods, where each nesting level uses the previous nesting level\'s glyph as a prefix. For example: 1., 1.1., 2., 2.2 .',
									},
									{
										name: 'Numbered: Upper Alphabetic, Alphabetic, Roman',
										value: 'NUMBERED_UPPERALPHA_ALPHA_ROMAN',
										description: 'An ordered list with <code>UPPERALPHA</code>, <code>ALPHA</code> and <code>ROMAN</code> numeric glyphs for the first 3 list nesting levels, followed by periods.',
									},
									{
										name: 'Numbered: Upper Roman, Upper Alphabetic, Decimal',
										value: 'NUMBERED_UPPERROMAN_UPPERALPHA_DECIMAL',
										description: 'An ordered list with <code>UPPERROMAN</code>, <code>UPPERALPHA</code> and <code>DECIMAL</code> numeric glyphs for the first 3 list nesting levels, followed by periods.',
									},
									{
										name: 'Numbered: Zero Decimal, Alphabetic, Roman',
										value: 'NUMBERED_ZERODECIMAL_ALPHA_ROMAN',
										description: 'An ordered list with <code>ZERODECIMAL</code>, <code>ALPHA</code> and <code>ROMAN</code> numeric glyphs for the first 3 list nesting levels, followed by periods.',
									},
								],
								description: 'Preset pattern of bullet glyphs for list.',
								default: 'BULLET_DISC_CIRCLE_SQUARE',
							},
							{
								displayName: 'Segment ID',
								name: 'segmentId',
								type: 'string',
								description: 'The ID of the header, footer or footnote that this range is contained in. An empty segment ID signifies the document\'s body.',
								default: '',
							},
							{
								displayName: 'Start Index',
								name: 'startIndex',
								type: 'number',
								description: 'The zero-based start index of this range.',
								default: 0,
							},
							{
								displayName: 'End Index',
								name: 'endIndex',
								type: 'number',
								description: 'The zero-based end index of this range.',
								default: 0,
							},
						],
					},
					{
						name: 'deleteFooterValues',
						displayName: 'Delete Footer',
						values: [
							{
								displayName: 'Footer ID',
								name: 'footerId',
								type: 'string',
								description: 'The ID of the footer to delete.',
								default: '',
							},
						],
					},
					{
						name: 'deleteHeaderValues',
						displayName: 'Delete Header',
						values: [
							{
								displayName: 'Header ID',
								name: 'headerId',
								type: 'string',
								description: 'The ID of the header to delete.',
								default: '',
							},
						],
					},
					{
						name: 'deleteNamedRangeValues',
						displayName: 'Delete Named Range',
						values: [
							{
								displayName: 'Named Range Reference',
								name: 'namedRangeReference',
								type: 'options',
								options: [
									{
										name: 'Name',
										value: 'name',
									},
									{
										name: 'Named Range ID',
										value: 'namedRangeId',
									},
								],
								description: 'The value that determines which range or ranges to delete.',
								default: 'namedRangeId',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								description: 'The value of the range reference.',
								default: '',
							},
						],
					},
					{
						name: 'deleteParagraphBulletsValues',
						displayName: 'Delete Paragraph Bullets',
						values: [
							{
								displayName: 'Segment ID',
								name: 'segmentId',
								type: 'string',
								description: 'The ID of the header, footer or footnote that this range is contained in. An empty segment ID signifies the document\'s body.',
								default: '',
							},
							{
								displayName: 'Start Index',
								name: 'startIndex',
								type: 'number',
								description: 'The zero-based start index of this range.',
								default: 0,
							},
							{
								displayName: 'End Index',
								name: 'endIndex',
								type: 'number',
								description: 'The zero-based end index of this range.',
								default: 0,
							},
						],
					},
					{
						name: 'deletePositionedObjectValues',
						displayName: 'Delete Positioned Object',
						values: [
							{
								displayName: 'Object ID',
								name: 'objectId',
								type: 'string',
								description: 'The ID of the positioned object to delete.',
								default: '',
							},
						],
					},
					{
						name: 'deleteTableColumnValues',
						displayName: 'Delete Table Column',
						values: [
							{
								displayName: 'Table Cell Row Index',
								name: 'rowIndex',
								type: 'number',
								description: 'The zero-based row index.',
								default: 0,
							},
							{
								displayName: 'Table Cell Column Index',
								name: 'columnIndex',
								type: 'number',
								description: 'The zero-based column index.',
								default: 0,
							},
							{
								displayName: 'Segment ID',
								name: 'segmentId',
								type: 'string',
								description: 'The ID of the header, footer or footnote the location is in. An empty segment ID signifies the document\'s body.',
								default: '',
							},
							{
								displayName: 'Index',
								name: 'index',
								type: 'number',
								description: 'The zero-based index, relative to the beginning of the specified segment.',
								default: 0,
							},
						],
					},
					{
						name: 'deleteTableRowValues',
						displayName: 'Delete Table Row',
						values: [
							{
								displayName: 'Table Cell Row Index',
								name: 'rowIndex',
								type: 'number',
								description: 'The zero-based row index.',
								default: 0,
							},
							{
								displayName: 'Table Cell Column Index',
								name: 'columnIndex',
								type: 'number',
								description: 'The zero-based column index.',
								default: 0,
							},
							{
								displayName: 'Segment ID',
								name: 'segmentId',
								type: 'string',
								description: 'The ID of the header, footer or footnote the location is in. An empty segment ID signifies the document\'s body.',
								default: '',
							},
							{
								displayName: 'Index',
								name: 'index',
								type: 'number',
								description: 'The zero-based index, relative to the beginning of the specified segment.',
								default: 0,
							},
						],
					},
					{
						name: 'insertPageBreakValues',
						displayName: 'Insert Page Break',
						values: [
							{
								displayName: 'Index',
								name: 'index',
								type: 'number',
								description: 'The zero-based index, relative to the beginning of the specified segment.',
								displayOptions: {
									show: {
										locationChoice: [
											'location',
										],
									},
								},
								default: 0,
							},
							{
								displayName: 'Insertion Location',
								name: 'locationChoice',
								type: 'options',
								options: [
									{
										name: 'End Of Segment Location',
										value: 'endOfSegmentLocation',
										description: 'Inserts the text at the end of a header, footer, footnote or the document body.',
									},
									{
										name: 'Location',
										value: 'location',
										description: 'Inserts the text at a specific index in the document.',
									},
								],
								description: 'The location where the text will be inserted.',
								default: 'endOfSegmentLocation',
							},
							{
								displayName: 'Segment ID',
								name: 'segmentId',
								type: 'string',
								description: 'The ID of the header, footer or footnote the location is in. An empty segment ID signifies the document\'s body.',
								default: '',
							},
						],
					},
					{
						name: 'insertTableValues',
						displayName: 'Insert Table',
						values: [
							{
								displayName: 'Rows',
								name: 'rows',
								type: 'number',
								description: 'The number of rows in the table.',
								default: 0,
							},
							{
								displayName: 'Columns',
								name: 'columns',
								type: 'number',
								description: 'The number of columns in the table.',
								default: 0,
							},
							{
								displayName: 'Insertion Location',
								name: 'locationChoice',
								type: 'options',
								options: [
									{
										name: 'End Of Segment Location',
										value: 'endOfSegmentLocation',
										description: 'Inserts the text at the end of a header, footer, footnote or the document body.',
									},
									{
										name: 'Location',
										value: 'location',
										description: 'Inserts the text at a specific index in the document.',
									},
								],
								description: 'The location where the text will be inserted.',
								default: 'endOfSegmentLocation',
							},
							{
								displayName: 'Segment ID',
								name: 'segmentId',
								type: 'string',
								description: 'The ID of the header, footer or footnote the location is in. An empty segment ID signifies the document\'s body.',
								default: '',
							},
							{
								displayName: 'Index',
								name: 'index',
								type: 'number',
								description: 'The zero-based index, relative to the beginning of the specified segment.',
								displayOptions: {
									show: {
										locationChoice: [
											'location',
										],
									},
								},
								default: 0,
							},
						],
					},
					{
						name: 'insertTextValues',
						displayName: 'Insert Text',
						values: [
							{
								displayName: 'Insertion Location',
								name: 'locationChoice',
								type: 'options',
								options: [
									{
										name: 'End Of Segment Location',
										value: 'endOfSegmentLocation',
										description: 'Inserts the text at the end of a header, footer, footnote or the document body.',
									},
									{
										name: 'Location',
										value: 'location',
										description: 'Inserts the text at a specific index in the document.',
									},
								],
								description: 'The location where the text will be inserted.',
								default: 'endOfSegmentLocation',
							},
							{
								displayName: 'Index',
								name: 'index',
								type: 'number',
								description: 'The zero-based index, relative to the beginning of the specified segment.',
								displayOptions: {
									show: {
										locationChoice: [
											'location',
										],
									},
								},
								default: 0,
							},
							{
								displayName: 'Segment ID',
								name: 'segmentId',
								type: 'string',
								description: 'The ID of the header, footer or footnote the location is in. An empty segment ID signifies the document\'s body.',
								default: '',
							},
							{
								displayName: 'Text',
								name: 'text',
								type: 'string',
								description: 'The text to insert in the document.',
								default: '',
							},
						],
					},
					{
						name: 'insertTableColumnValues',
						displayName: 'Insert Table Column',
						values: [
							{
								displayName: 'Insert Right',
								name: 'insertRight',
								type: 'boolean',
								description: 'Whether to insert new column to the right of the reference cell location.',
								default: true,
							},
							{
								displayName: 'Table Cell Row Index',
								name: 'rowIndex',
								type: 'number',
								description: 'The zero-based row index.',
								default: 0,
							},
							{
								displayName: 'Table Cell Column Index',
								name: 'columnIndex',
								type: 'number',
								description: 'The zero-based column index.',
								default: 0,
							},
							{
								displayName: 'Segment ID',
								name: 'segmentId',
								type: 'string',
								description: 'The ID of the header, footer or footnote the location is in. An empty segment ID signifies the document\'s body.',
								default: '',
							},
							{
								displayName: 'Index',
								name: 'index',
								type: 'number',
								description: 'The zero-based index, relative to the beginning of the specified segment.',
								default: 0,
							},
						],
					},
					{
						name: 'insertTableRowValues',
						displayName: 'Insert Table Row',
						values: [
							{
								displayName: 'Insert Below',
								name: 'insertBelow',
								type: 'boolean',
								description: 'Whether to insert a new row below the reference cell location.',
								default: true,
							},
							{
								displayName: 'Table Cell Row Index',
								name: 'rowIndex',
								type: 'number',
								description: 'The zero-based row index.',
								default: 0,
							},
							{
								displayName: 'Table Cell Column Index',
								name: 'columnIndex',
								type: 'number',
								description: 'The zero-based column index.',
								default: 0,
							},
							{
								displayName: 'Segment ID',
								name: 'segmentId',
								type: 'string',
								description: 'The ID of the header, footer or footnote the location is in. An empty segment ID signifies the document\'s body.',
								default: '',
							},
							{
								displayName: 'Index',
								name: 'index',
								type: 'number',
								description: 'The zero-based index, relative to the beginning of the specified segment.',
								default: 0,
							},
						],
					},
					{
						name: 'replaceAllTextValues',
						displayName: 'Replace All Text',
						values: [
							{
								displayName: 'Match Case',
								name: 'matchCase',
								type: 'boolean',
								description: 'Indicates whether the search should respect case sensitivity.',
								default: false,
							},
							{
								displayName: 'New Text',
								name: 'replaceText',
								type: 'string',
								description: 'The text that will replace the matched text.',
								default: '',
							},
							{
								displayName: 'Old Text',
								name: 'text',
								type: 'string',
								description: 'The text to search for in the document.',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Write Control',
				name: 'writeControl',
				placeholder: 'Add Write Control',
				type: 'fixedCollection',
				description: 'Settings for how to execute update requests.',
				default: {},
				options: [
					{
						displayName: 'Write Control Object',
						name: 'writeControlObject',
						values: [
							{
								displayName: 'Control Field',
								name: 'control',
								type: 'options',
								options: [
									{
										name: 'Target Revision ID',
										value: 'targetRevisionId',
										description: 'The revision ID of the document that the write request will be applied to.',
									},
									{
										name: 'Required Revision ID',
										value: 'requiredRevisionId',
										description: 'The target revision ID of the document that the write request will be applied to.',
									},
								],
								default: 'requiredRevisionId',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
			},
		],
	},
] as INodeProperties[];
