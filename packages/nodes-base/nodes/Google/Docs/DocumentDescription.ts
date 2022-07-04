import {
	INodeProperties,
} from 'n8n-workflow';

export const documentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
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
				action: 'Create a document',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a document',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a document',
			},
		],
		default: 'create',
	},
];

export const documentFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                 document: create                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Drive Name or ID',
		name: 'driveId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
		typeOptions: {
			loadOptionsMethod: 'getDrives',
		},
		default: 'myDrive',
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
		displayName: 'Folder Name or ID',
		name: 'folderId',
		type: 'options',
		description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/nodes/expressions.html#expressions">expression</a>',
		typeOptions: {
			loadOptionsDependsOn: [
				'driveId',
			],
			loadOptionsMethod: 'getFolders',
		},
		default: '',
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
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
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
	/*                                 document: get                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc ID or URL',
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
		description: 'The ID in the document URL (or just paste the whole URL)',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		type: 'boolean',
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
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},

	/* -------------------------------------------------------------------------- */
	/*                                 document: update                            */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Doc ID or URL',
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
		description: 'The ID in the document URL (or just paste the whole URL)',
	},
	{
		displayName: 'Simplify',
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
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
	{
		displayName: 'Actions',
		name: 'actionsUi',
		description: 'Actions applied to update the document',
		type: 'fixedCollection',
		placeholder: 'Add Action',
		typeOptions: {
			multipleValues: true,
		},
		default: {
			actionFields: [
				{
					object: 'text',
					action: 'insert',
					locationChoice: 'endOfSegmentLocation',
					index: 0,
					text: '',
				},
			],
		},
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
								name: 'Footer',
								value: 'footer',
							},
							{
								name: 'Header',
								value: 'header',
							},
							{
								name: 'Named Range',
								value: 'namedRange',
							},
							{
								name: 'Page Break',
								value: 'pageBreak',
							},
							{
								name: 'Paragraph Bullets',
								value: 'paragraphBullets',
							},
							{
								name: 'Positioned Object',
								value: 'positionedObject',
							},
							{
								name: 'Table',
								value: 'table',
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
						],
						description: 'The update object',
						default: 'text',
					},
					// Action fields (depend on the Object field)
					{
						displayName: 'Action',
						name: 'action',
						type: 'options',
						options: [
							{
								name: 'Find and Replace Text',
								value: 'replaceAll',
							},
							{
								name: 'Insert',
								value: 'insert',
							},
						],
						displayOptions: {
							show: {
								object: [
									'text',
								],
							},
						},
						description: 'The update action',
						default: '',
					},
					{
						displayName: 'Action',
						name: 'action',
						type: 'options',
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
									'namedRange',
									'paragraphBullets',
								],
							},
						},
						description: 'The update action',
						default: '',
					},
					{
						displayName: 'Action',
						name: 'action',
						type: 'options',
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
						description: 'The update action',
						default: '',
					},
					{
						displayName: 'Action',
						name: 'action',
						type: 'options',
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
						description: 'The update action',
						default: '',
					},
					{
						displayName: 'Action',
						name: 'action',
						type: 'options',
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
						description: 'The update action',
						default: '',
					},
					// Shared Segment inputs for Create action (moved up for display purposes)
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
						description: 'The location where to create the object',
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
						description: 'The ID of the header, footer or footnote. The <code>Document → Get</code> operation lists all segment IDs (make sure you disable the <code>simple</code> toggle).',
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
					// Inputs fields
					// create footer
					// create header
					{
						displayName: 'Index',
						name: 'index',
						type: 'number',
						description: 'The zero-based index, relative to the beginning of the specified segment',
						default: 0,
						displayOptions: {
							show: {
								object: [
									'footer',
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
						description: 'The zero-based start index of this range',
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
						description: 'The zero-based end index of this range',
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
								name: 'Bullet List',
								value: 'BULLET_DISC_CIRCLE_SQUARE',
								description: 'A bulleted list with a <code>DISC</code>, <code>CIRCLE</code> and <code>SQUARE</code> bullet glyph for the first 3 list nesting levels',
							},
							{
								name: 'Checkbox List',
								value: 'BULLET_CHECKBOX',
								description: 'A bulleted list with CHECKBOX bullet glyphs for all list nesting levels',
							},
							{
								name: 'Numbered List',
								value: 'NUMBERED_DECIMAL_NESTED',
								description: 'A numbered list with <code>DECIMAL</code> numeric glyphs separated by periods, where each nesting level uses the previous nesting level\'s glyph as a prefix. For example: 1., 1.1., 2., 2.2 .',
							},
						],
						description: 'The Preset pattern of bullet glyphs for list',
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
						description: 'The ID of the footer to delete. To retrieve it, use the <code>get document</code> where you can find under <code>footers</code> attribute.',
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
						description: 'The ID of the header to delete. To retrieve it, use the <code>get document</code> where you can find under <code>headers</code> attribute.',
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
						displayName: 'Specify Range By',
						name: 'namedRangeReference',
						type: 'options',
						options: [
							{
								name: 'ID',
								value: 'namedRangeId',
							},
							{
								name: 'Name',
								value: 'name',
							},
						],
						description: 'The value determines which range or ranges to delete',
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
						description: 'The ID of the range',
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
						description: 'The name of the range',
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
					// delete bullets (shared inputs added below)
					// delete positioned object
					{
						displayName: 'Object ID',
						name: 'objectId',
						type: 'string',
						description: 'The ID of the positioned object to delete (An object that is tied to a paragraph and positioned relative to its beginning), See the Google <a href="https://developers.google.com/docs/api/reference/rest/v1/PositionedObject">documentation</a>',
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
					// insert table column/row (shared inputs added below)
					// delete table column/row (shared inputs added below)
					// Shared Segment inputs for Insert action (moved up for display purposes)
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
						description: 'The location where to create the object',
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
						description: 'The ID of the header, footer or footnote. The <code>Document → Get</code> operation lists all segment IDs (make sure you disable the <code>simple</code> toggle).',
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
					// insert page break
					{
						displayName: 'Insert Location',
						name: 'locationChoice',
						type: 'options',
						options: [
							{
								name: 'At End of Specific Position',
								value: 'endOfSegmentLocation',
								description: 'Inserts the text at the end of a header, footer, footnote, or document body',
							},
							{
								name: 'At Index',
								value: 'location',
							},
						],
						description: 'The location where the text will be inserted',
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
					{
						displayName: 'Index',
						name: 'index',
						type: 'number',
						description: 'The zero-based index, relative to the beginning of the specified segment',
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
						typeOptions: {
							minValue: 1,
						},
						default: 1,
					},
					// insert table
					{
						displayName: 'Insert Location',
						name: 'locationChoice',
						type: 'options',
						options: [
							{
								name: 'At End of Specific Position',
								value: 'endOfSegmentLocation',
								description: 'Inserts the text at the end of a header, footer, footnote, or document body',
							},
							{
								name: 'At Index',
								value: 'location',
							},
						],
						description: 'The location where the text will be inserted',
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
						description: 'The zero-based index, relative to the beginning of the specified segment (use index + 1 to refer to a table)',
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
						default: 1,
						typeOptions: {
							minValue: 1,
						},
					},
					{
						displayName: 'Rows',
						name: 'rows',
						type: 'number',
						description: 'The number of rows in the table',
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
						description: 'The number of columns in the table',
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
					// insert text
					{
						displayName: 'Insert Location',
						name: 'locationChoice',
						type: 'options',
						options: [
							{
								name: 'At End of Specific Position',
								value: 'endOfSegmentLocation',
								description: 'Inserts the text at the end of a header, footer, footnote, or document body',
							},
							{
								name: 'At Index',
								value: 'location',
							},
						],
						description: 'The location where the text will be inserted',
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
						typeOptions: {
							minValue: 1,
						},
						description: 'The zero-based index, relative to the beginning of the specified segment',
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
						default: 1,
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						description: 'The text to insert in the document',
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
					// replace all text
					{
						displayName: 'Old Text',
						name: 'text',
						type: 'string',
						description: 'The text to search for in the document',
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
						displayName: 'New Text',
						name: 'replaceText',
						type: 'string',
						description: 'The text that will replace the matched text',
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
						description: 'Whether the search should respect case sensitivity',
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
					// Shared Segment inputs for Delete action
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
						description: 'The location where to create the object',
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
						description: 'The ID of the header, footer or footnote. The <code>Document → Get</code> operation lists all segment IDs (make sure you disable the <code>simple</code> toggle).',
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
					// Shared inputs for paragraph bullets
					{
						displayName: 'Start Index',
						name: 'startIndex',
						type: 'number',
						description: 'The zero-based start index of this range',
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
						description: 'The zero-based end index of this range',
						default: 0,
						displayOptions: {
							show: {
								object: [
									'paragraphBullets',
								],
							},
						},
					},
					// Shared inputs for table column/row
					{
						displayName: 'Insert Position',
						name: 'insertPosition',
						type: 'options',
						options: [
							{
								name: 'Before Content at Index',
								value: false,
							},
							{
								name: 'After Content at Index',
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
					{
						displayName: 'Index',
						name: 'index',
						type: 'number',
						description: 'The zero-based index, relative to the beginning of the specified segment (use index + 1 to refer to a table)',
						default: 1,
						typeOptions: {
							minValue: 1,
						},
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
						description: 'The zero-based row index',
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
						description: 'The zero-based column index',
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
				],
			},
		],
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'fixedCollection',
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
				displayName: 'Write Control Object',
				name: 'writeControlObject',
				values: [
					{
						displayName: 'Revision Mode',
						name: 'control',
						type: 'options',
						options: [
							{
								name: 'Target',
								value: 'targetRevisionId',
								description: 'Apply changes to the latest revision. Otherwise changes will not be processed.',
							},
							{
								name: 'Required',
								value: 'requiredRevisionId',
								description: 'Apply changes to the provided revision while incorporating other collaborators\' changes. This mode is used for the recent revision, Otherwise changes will not be processed.',
							},
						],
						default: 'requiredRevisionId',
						description: 'Determines how the changes are applied to the revision',
					},
					{
						displayName: 'Revision ID',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
];
