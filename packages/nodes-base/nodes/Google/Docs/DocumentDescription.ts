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
				type: 'fixedCollection',
				default: '',
				placeholder: 'Add Request',
				typeOptions: {
					multipleValues: true,
				},
				options: [
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
								displayName: 'Replace Text',
								name: 'replaceText',
								type: 'string',
								description: 'The text that will replace the matched text.',
								default: '',
							},
							{
								displayName: 'Text',
								name: 'text',
								type: 'string',
								description: 'The text to search for in the document.',
								default: '',
							},
						],
					},
					{
						name: 'insertTextValues',
						displayName: 'Insert Text',
						values: [
							{
								displayName: 'Text',
								name: 'text',
								type: 'string',
								description: 'The text to search for in the document.',
								default: '',
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
						name: 'insertPageBreakValues',
						displayName: 'Insert Page Break',
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
						name: 'createParagraphBulletsValues',
						displayName: 'Create Paragraph Bullets Style',
						values: [
							{
								displayName: 'Bullet Preset',
								name: 'bulletPreset',
								type: 'options',
								options: [
									{
										name: 'Bullet glyph preset unspecified',
										value: 'BULLET_GLYPH_PRESET_UNSPECIFIED',
										description: 'The bullet glyph preset is unspecified.',
									},
									{
										name: 'Bullet glyphs: disc, circle, square',
										value: 'BULLET_DISC_CIRCLE_SQUARE',
										description: 'A bulleted list with a <code>DISC</code>, <code>CIRCLE</code> and <code>SQUARE</code> bullet glyph for the first 3 list nesting levels.',
									},
									{
										name: 'Bullet glyphs: diamond X, arrow 3D, square',
										value: 'BULLET_DIAMONDX_ARROW3D_SQUARE',
										description: 'A bulleted list with a <code>DIAMONDX</code>, <code>ARROW3D</code> and <code>SQUARE</code> bullet glyph for the first 3 list nesting levels.',
									},
									{
										name: 'Bullet glyph: checkbox',
										value: 'BULLET_CHECKBOX',
										description: 'A bulleted list with CHECKBOX bullet glyphs for all list nesting levels.',
									},
									{
										name: 'Bullet glyphs: arrow, diamond, disc',
										value: 'BULLET_ARROW_DIAMOND_DISC',
										description: 'A bulleted list with a <code>ARROW</code>, <code>DIAMOND</code> and <code>DISC</code> bullet glyph for the first 3 list nesting levels.',
									},
									{
										name: 'Bullet glyphs: star, circle, square',
										value: 'BULLET_STAR_CIRCLE_SQUARE',
										description: 'A bulleted list with a <code>STAR</code>, <code>CIRCLE</code> and <code>SQUARE</code> bullet glyph for the first 3 list nesting levels.',
									},
									{
										name: 'Bullet glyphs: arrow 3D, circle, square',
										value: 'BULLET_ARROW3D_CIRCLE_SQUARE',
										description: 'A bulleted list with a <code>ARROW3D</code>, <code>CIRCLE</code> and <code>SQUARE</code> bullet glyph for the first 3 list nesting levels.',
									},
									{
										name: 'Bullet glyphs: left triangle, diamond, disc',
										value: 'BULLET_LEFTTRIANGLE_DIAMOND_DISC',
										description: 'A bulleted list with a <code>LEFTTRIANGLE</code>, <code>DIAMOND</code> and <code>DISC</code> bullet glyph for the first 3 list nesting levels.',
									},
									{
										name: 'Bullet glyphs: diamond X, hollow diamond, square',
										value: 'BULLET_DIAMONDX_HOLLOWDIAMOND_SQUARE',
										description: 'A bulleted list with a <code>DIAMONDX</code>, <code>HOLLOWDIAMOND</code> and <code>SQUARE</code> bullet glyph for the first 3 list nesting levels.',
									},
									{
										name: 'Bullet glyphs: diamond, circle, square',
										value: 'BULLET_DIAMOND_CIRCLE_SQUARE',
										description: 'A bulleted list with a <cpde>DIAMOND</code>, <code>CIRCLE</code> and <code>SQUARE</code> bullet glyph for the first 3 list nesting levels.',
									},
									{
										name: 'Numbered decimal: alpha, roman',
										value: 'NUMBERED_DECIMAL_ALPHA_ROMAN',
										description: 'A numbered list with <code>DECIMAL</code>, <code>ALPHA</code> and <code>ROMAN</code> numeric glyphs for the first 3 list nesting levels, followed by periods.',
									},
									{
										name: 'Numbered decimal: alpha, roman, parens',
										value: 'NUMBERED_DECIMAL_ALPHA_ROMAN_PARENS',
										description: 'A numbered list with <code>DECIMAL</code>, <code>ALPHA</code> and <code>ROMAN</code> numeric glyphs for the first 3 list nesting levels, followed by parenthesis.',
									},
									{
										name: 'Numbered decimal: nested',
										value: 'NUMBERED_DECIMAL_NESTED',
										description: 'A numbered list with <code>DECIMAL</code> numeric glyphs separated by periods, where each nesting level uses the previous nesting level\'s glyph as a prefix. For example: 1., 1.1., 2., 2.2 .',
									},
									{
										name: 'Numbered: upper alpha, alpha, roman',
										value: 'NUMBERED_UPPERALPHA_ALPHA_ROMAN',
										description: 'A numbered list with <code>UPPERALPHA</code>, <code>ALPHA</code> and <code>ROMAN</code> numeric glyphs for the first 3 list nesting levels, followed by periods.',
									},
									{
										name: 'Numbered: upper roman, upper alpha, decimal',
										value: 'NUMBERED_UPPERROMAN_UPPERALPHA_DECIMAL',
										description: 'A numbered list with <code>UPPERROMAN</code>, <code>UPPERALPHA</code> and <code>DECIMAL</code> numeric glyphs for the first 3 list nesting levels, followed by periods.',
									},
									{
										name: 'Numbered: zero decimal, alpha, roman',
										value: 'NUMBERED_ZERODECIMAL_ALPHA_ROMAN',
										description: 'A numbered list with <code>ZERODECIMAL</code>, <code>ALPHA</code> and <code>ROMAN</code> numeric glyphs for the first 3 list nesting levels, followed by periods.',
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
								default: 'name',
							},
						],
					},
					{
						name: 'deletePositionedObjectValues',
						displayName: 'Delete Position Object',
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
						name: 'createHeaderValues',
						displayName: 'Create Header',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Default',
										value: 'DEFAULT',
										description: 'A default header.',
									},
									{
										name: 'Unspecified',
										value: 'HEADER_FOOTER_TYPE_UNSPECIFIED',
										description: 'The header type is unspecified.',
									},
								],
								description: 'The type of header to create.',
								default: 'DEFAULT',
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
						name: 'createFooterValues',
						displayName: 'Create Footer',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: [
									{
										name: 'Default',
										value: 'DEFAULT',
										description: 'A default header.',
									},
									{
										name: 'Unspecified',
										value: 'HEADER_FOOTER_TYPE_UNSPECIFIED',
										description: 'The footer type is unspecified.',
									},
								],
								description: 'The type of footer to create.',
								default: 'DEFAULT',
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
				],
			},
			{
				displayName: 'Write Control',
				name: 'writeControl',
				placeholder: 'Add Write Control',
				type: 'fixedCollection',
				default: {},
				options: [
					{
						displayName: 'Write Control Object',
						name: 'writeControlObject',
						values: [
							{
								displayName: 'Control field',
								name: 'control',
								type: 'options',
								options: [
									{
										name: 'Target Revision ID',
										value: 'targetRevisionId',
									},
									{
										name: 'Required Revision ID',
										value: 'requiredRevisionId',
									},
								],
								default: 'requiredRevisionId',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: 'targetRevisionId',
								description: 'Revision ID value.',
							},
						],
					},
				],
			},
		],
	},
] as INodeProperties[];
