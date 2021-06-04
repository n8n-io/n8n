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
	/*                                 document: create                             */
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
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
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
		default: true,
		description: 'When set to true a simplify version of the response will be used else the raw data.',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
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
		options: [
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				description: 'Document content.',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 document: get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Document URL',
		name: 'documentURL',
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
		description: 'The document URL.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                 document: update                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Document URL',
		name: 'documentURL',
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
		description: 'The document URL.',
	},
	{
		displayName: 'Simple',
		name: 'simple',
		type: 'boolean',
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
		default: true,
		description: 'When set to true a simplify version of the response will be used else the raw data.',
	},
	{
		displayName: 'Actions',
		name: 'actionsUi',
		description: 'Actions applied to update the document.',
		type: 'fixedCollection',
		placeholder: 'Add Action',
		typeOptions: {
			multipleValues: true,
		},
		default: '',
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
				name: 'actionFields',
				displayName: 'Action Fields',
				values: [
					// Object field
					{
						displayName: 'Object',
						name: 'object',
						type: 'options',
						options: [
							{
								name: 'Positioned Object',
								value: 'positionedObject',
							},
							{
								name: 'Page Break',
								value: 'pageBreak',
							},
							{
								name: 'Table',
								value: 'table',
							},
							{
								name: 'Footer',
								value: 'footer',
							},
							{
								name: 'Header',
								value: 'header',
							},
							{
								name: 'Table Column',
								value: 'tableColumn',
							},
							{
								name: 'Table Row',
								value: 'tableRow',
							},
							{
								name: 'Text',
								value: 'text',
							},
							{
								name: 'Paragraph Bullets',
								value: 'paragraphBullets',
							},
							{
								name: 'Named Range',
								value: 'namedRange',
							},
						],
						description: 'The action object.',
						default: 'text',
					},
					// Action field
					{
						displayName: 'Action',
						name: 'action',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn: 'object',
						},
						options: [
							{
								name: 'Create',
								value: 'create',
							},
							{
								name: 'Delete',
								value: 'delete',
							},
						],
						displayOptions: {
							show: {
								object: [
									'footer',
									'header',
									'paragraphBullets',
									'namedRange',
								],
							},
						},
						description: 'The action object.',
						default: 'create',
					},
					{
						displayName: 'Action',
						name: 'action',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn: 'object',
						},
						options: [
							{
								name: 'Delete',
								value: 'delete',
							},
							{
								name: 'Insert',
								value: 'insert',
							},
						],
						displayOptions: {
							show: {
								object: [
									'tableColumn',
									'tableRow',
								],
							},
						},
						description: 'The action itself.',
						default: 'insert',
					},
					{
						displayName: 'Action',
						name: 'action',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn: 'object',
						},
						options: [
							{
								name: 'Insert',
								value: 'insert',
							},
							{
								name: 'Find and replace text',
								value: 'replaceAll',
							},
						],
						displayOptions: {
							show: {
								object: [
									'text',
								],
							},
						},
						description: 'The action itself.',
						default: 'insert',
					},
					{
						displayName: 'Action',
						name: 'action',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn: 'object',
						},
						options: [
							{
								name: 'Insert',
								value: 'insert',
							},
						],
						displayOptions: {
							show: {
								object: [
									'pageBreak',
									'table',
								],
							},
						},
						description: 'The action itself.',
						default: 'insert',
					},
					{
						displayName: 'Action',
						name: 'action',
						type: 'options',
						typeOptions: {
							loadOptionsDependsOn: 'object',
						},
						options: [
							{
								name: 'Delete',
								value: 'delete',
							},
						],
						displayOptions: {
							show: {
								object: [
									'positionedObject',
								],
							},
						},
						description: 'The action itself.',
						default: 'delete',
					},
					// Operation fields
					// create footer
					{
						displayName: 'Index',
						name: 'index',
						type: 'number',
						description: 'The zero-based index, relative to the beginning of the specified segment.',
						default: 0,
						displayOptions: {
							show: {
								object: [
									'footer',
								],
								action: [
									'create',
								],
							},
						},
					},
					// create header
					{
						displayName: 'Index',
						name: 'index',
						type: 'number',
						description: 'The zero-based index, relative to the beginning of the specified segment.',
						default: 0,
						displayOptions: {
							show: {
								object: [
									'header',
								],
								action: [
									'create',
								],
							},
						},
					},
					// create named range
					{
						displayName: 'Name',
						name: 'name',
						type: 'string',
						description: 'The name of the Named Range. Names do not need to be unique.',
						default: '',
						displayOptions: {
							show: {
								object: [
									'namedRange',
								],
								action: [
									'create',
								],
							},
						},
					},
					{
						displayName: 'Start Index',
						name: 'startIndex',
						type: 'number',
						description: 'The zero-based start index of this range.',
						default: 0,
						displayOptions: {
							show: {
								object: [
									'namedRange',
								],
								action: [
									'create',
								],
							},
						},
					},
					{
						displayName: 'End Index',
						name: 'endIndex',
						type: 'number',
						description: 'The zero-based end index of this range.',
						default: 0,
						displayOptions: {
							show: {
								object: [
									'namedRange',
								],
								action: [
									'create',
								],
							},
						},
					},
					// create bullets
					{
						displayName: 'Style',
						name: 'bulletPreset',
						type: 'options',
						options: [
							{
								name: 'Checkbox List',
								value: 'BULLET_CHECKBOX',
								description: 'A bulleted list with CHECKBOX bullet glyphs for all list nesting levels.',
							},
							{
								name: 'Bullet List',
								value: 'BULLET_DISC_CIRCLE_SQUARE',
								description: 'A bulleted list with a <code>DISC</code>, <code>CIRCLE</code> and <code>SQUARE</code> bullet glyph for the first 3 list nesting levels.',
							},
							{
								name: 'Numbered List',
								value: 'NUMBERED_DECIMAL_NESTED',
								description: 'A numbered list with <code>DECIMAL</code> numeric glyphs separated by periods, where each nesting level uses the previous nesting level\'s glyph as a prefix. For example: 1., 1.1., 2., 2.2 .',
							},
						],
						description: 'Preset pattern of bullet glyphs for list.',
						default: 'BULLET_DISC_CIRCLE_SQUARE',
						displayOptions: {
							show: {
								object: [
									'paragraphBullets',
								],
								action: [
									'create',
								],
							},
						},
					},
					// delete footer
					{
						displayName: 'Footer ID',
						name: 'footerId',
						type: 'string',
						description: 'The ID of the footer to delete.',
						default: '',
						displayOptions: {
							show: {
								object: [
									'footer',
								],
								action: [
									'delete',
								],
							},
						},
					},
					// delete header
					{
						displayName: 'Header ID',
						name: 'headerId',
						type: 'string',
						description: 'The ID of the header to delete.',
						default: '',
						displayOptions: {
							show: {
								object: [
									'header',
								],
								action: [
									'delete',
								],
							},
						},
					},
					// delete named range
					{
						displayName: 'Specify range by',
						name: 'namedRangeReference',
						type: 'options',
						options: [
							{
								name: 'Name',
								value: 'name',
							},
							{
								name: 'ID',
								value: 'namedRangeId',
							},
						],
						description: 'The value that determines which range or ranges to delete.',
						default: 'namedRangeId',
						displayOptions: {
							show: {
								object: [
									'namedRange',
								],
								action: [
									'delete',
								],
							},
						},
					},
					{
						displayName: 'ID',
						name: 'value',
						type: 'string',
						description: 'The ID of the range.',
						default: '',
						displayOptions: {
							show: {
								object: [
									'namedRange',
								],
								action: [
									'delete',
								],
								namedRangeReference: [
									'namedRangeId',
								],
							},
						},
					},
					{
						displayName: 'Name',
						name: 'value',
						type: 'string',
						description: 'The name of the range.',
						default: '',
						displayOptions: {
							show: {
								object: [
									'namedRange',
								],
								action: [
									'delete',
								],
								namedRangeReference: [
									'name',
								],
							},
						},
					},
					// delete bullets

					// delete positioned object
					{
						displayName: 'Object ID',
						name: 'objectId',
						type: 'string',
						description: 'The ID of the positioned object to delete (An object that is tied to a paragraph and positioned relative to its beginning), See the Google <a href="https://developers.google.com/docs/api/reference/rest/v1/PositionedObject">documentation</a>.',
						default: '',
						displayOptions: {
							show: {
								object: [
									'positionedObject',
								],
								action: [
									'delete',
								],
							},
						},
					},
					// delete table column

					// delete table row

					// insert page break
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
								object: [
									'pageBreak',
								],
								action: [
									'insert',
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
						displayOptions: {
							show: {
								object: [
									'pageBreak',
								],
								action: [
									'insert',
								],
							},
						},
					},
					// insert table
					{
						displayName: 'Rows',
						name: 'rows',
						type: 'number',
						description: 'The number of rows in the table.',
						default: 0,
						displayOptions: {
							show: {
								object: [
									'table',
								],
								action: [
									'insert',
								],
							},
						},
					},
					{
						displayName: 'Columns',
						name: 'columns',
						type: 'number',
						description: 'The number of columns in the table.',
						default: 0,
						displayOptions: {
							show: {
								object: [
									'table',
								],
								action: [
									'insert',
								],
							},
						},
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
						displayOptions: {
							show: {
								object: [
									'table',
								],
								action: [
									'insert',
								],
							},
						},
					},
					{
						displayName: 'Index',
						name: 'index',
						type: 'number',
						description: 'The zero-based index, relative to the beginning of the specified segment (use index + 1 to refer a table).',
						displayOptions: {
							show: {
								locationChoice: [
									'location',
								],
								object: [
									'table',
								],
								action: [
									'insert',
								],
							},
						},
						default: 0,
					},
					// insert text
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
						displayOptions: {
							show: {
								object: [
									'text',
								],
								action: [
									'insert',
								],
							},
						},
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
								object: [
									'text',
								],
								action: [
									'insert',
								],
							},
						},
						default: 0,
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						description: 'The text to insert in the document.',
						default: '',
						displayOptions: {
							show: {
								object: [
									'text',
								],
								action: [
									'insert',
								],
							},
						},
					},
					// insert table column

					// insert table row

					// replace all text
					{
						displayName: 'New Text',
						name: 'replaceText',
						type: 'string',
						description: 'The text that will replace the matched text.',
						default: '',
						displayOptions: {
							show: {
								object: [
									'text',
								],
								action: [
									'replaceAll',
								],
							},
						},
					},
					{
						displayName: 'Old Text',
						name: 'text',
						type: 'string',
						description: 'The text to search for in the document.',
						default: '',
						displayOptions: {
							show: {
								object: [
									'text',
								],
								action: [
									'replaceAll',
								],
							},
						},
					},
					{
						displayName: 'Match Case',
						name: 'matchCase',
						type: 'boolean',
						description: 'Indicates whether the search should respect case sensitivity.',
						default: false,
						displayOptions: {
							show: {
								object: [
									'text',
								],
								action: [
									'replaceAll',
								],
							},
						},
					},
					/*                                                */
					/*                 Common Fields                  */
					/*                                                */

					// Segment ID related inputs

					// Create action
					{
						displayName: 'Insert Segment',
						name: 'insertSegment',
						type: 'options',
						options: [
							{
								name: 'Header',
								value: 'header',
							},
							{
								name: 'Body',
								value: 'body',
							},
							{
								name: 'Footer',
								value: 'footer',
							},
						],
						description: 'The location where to create the boject.',
						default: 'body',
						displayOptions: {
							show: {
								object: [
									'footer',
									'header',
									'paragraphBullets',
									'namedRange',
								],
								action: [
									'create',
								],
							},
						},
					},
					{
						displayName: 'Segment ID',
						name: 'segmentId',
						type: 'string',
						description: 'The ID of the header, footer or footnote the location is in. An empty segment ID signifies the document\'s body.',
						default: '',
						displayOptions: {
							show: {
								object: [
									'footer',
									'header',
									'paragraphBullets',
									'namedRange',
								],
								action: [
									'create',
								],
							},
							hide: {
								insertSegment: [
									'body',
								],
							},
						},
					},
					// insert action
					{
						displayName: 'Insert Segment',
						name: 'insertSegment',
						type: 'options',
						options: [
							{
								name: 'Header',
								value: 'header',
							},
							{
								name: 'Body',
								value: 'body',
							},
							{
								name: 'Footer',
								value: 'footer',
							},
						],
						description: 'The location where to create the boject.',
						default: 'body',
						displayOptions: {
							show: {
								object: [
									'pageBreak',
									'table',
									'tableColumn',
									'tableRow',
									'text',
								],
								action: [
									'insert',
								],
							},
						},
					},
					{
						displayName: 'Segment ID',
						name: 'segmentId',
						type: 'string',
						description: 'The ID of the header, footer or footnote the location is in. An empty segment ID signifies the document\'s body.',
						default: '',
						displayOptions: {
							show: {
								object: [
									'pageBreak',
									'table',
									'tableColumn',
									'tableRow',
									'text',
								],
								action: [
									'insert',
								],
							},
							hide: {
								insertSegment: [
									'body',
								],
							},
						},
					},
					// delete action
					{
						displayName: 'Insert Segment',
						name: 'insertSegment',
						type: 'options',
						options: [
							{
								name: 'Header',
								value: 'header',
							},
							{
								name: 'Body',
								value: 'body',
							},
							{
								name: 'Footer',
								value: 'footer',
							},
						],
						description: 'The location where to create the boject.',
						default: 'body',
						displayOptions: {
							show: {
								object: [
									'paragraphBullets',
									'tableColumn',
									'tableRow',
								],
								action: [
									'delete',
								],
							},
						},
					},
					{
						displayName: 'Segment ID',
						name: 'segmentId',
						type: 'string',
						description: 'The ID of the header, footer or footnote the location is in. An empty segment ID signifies the document\'s body.',
						default: '',
						displayOptions: {
							show: {
								object: [
									'paragraphBullets',
									'tableColumn',
									'tableRow',
								],
								action: [
									'delete',
								],
							},
							hide: {
								insertSegment: [
									'body',
								],
							},
						},
					},

					// Shared between paragrahs oeprations
					{
						displayName: 'Start Index',
						name: 'startIndex',
						type: 'number',
						description: 'The zero-based start index of this range.',
						default: 0,
						displayOptions: {
							show: {
								object: [
									'paragraphBullets',
								],
							},
						},
					},
					{
						displayName: 'End Index',
						name: 'endIndex',
						type: 'number',
						description: 'The zero-based end index of this range.',
						default: 0,
						displayOptions: {
							show: {
								object: [
									'paragraphBullets',
								],
							},
						},
					},
					// share between table column and table row
					{
						displayName: 'Index',
						name: 'index',
						type: 'number',
						description: 'The zero-based index, relative to the beginning of the specified segment (use index + 1 to refer a table).',
						default: 0,
						displayOptions: {
							show: {
								object: [
									'tableColumn',
									'tableRow',
								],
							},
						},
					},
					{
						displayName: 'Row Index',
						name: 'rowIndex',
						type: 'number',
						description: 'The zero-based row index.',
						default: 0,
						displayOptions: {
							show: {
								object: [
									'tableColumn',
									'tableRow',
								],
							},
						},
					},
					{
						displayName: 'Column Index',
						name: 'columnIndex',
						type: 'number',
						description: 'The zero-based column index.',
						default: 0,
						displayOptions: {
							show: {
								object: [
									'tableColumn',
									'tableRow',
								],
							},
						},
					},
					{
						displayName: 'Insert',
						name: 'insertPosition',
						type: 'options',
						options: [
							{
								name: 'Before content at index',
								value: false,
							},
							{
								name: 'After content at index',
								value: true,
							},
						],
						default: true,
						displayOptions: {
							show: {
								object: [
									'tableColumn',
									'tableRow',
								],
								action: [
									'insert',
								],
							},
						},
					},
				],
			},
		],
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
