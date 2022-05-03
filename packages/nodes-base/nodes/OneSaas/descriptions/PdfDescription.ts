import { INodeProperties } from 'n8n-workflow';

export const pdfOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['pdf'],
			},
		},
		options: [
			{
				name: 'Count PDF Pages',
				value: 'count',
				description: 'Count PDF Pages',
			},
			{
				name: 'Split PDF Files',
				value: 'split',
				description: 'Split a PDF file into multiple files',
			},
			{
				name: 'PDF Merge',
				value: 'merge',
				description: 'Merge multiple pdf files to a single pdf',
			},
			{
				name: 'HTML to PDF',
				value: 'html',
				description: 'Converts HTML Code or a URL to PDF with options',
			},
		],
		default: 'count',
	},
] as INodeProperties[];

export const pdfFields = [
	// pdf: count
	{
		displayName: 'URL or binary data',
		name: 'datatype',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: ['count', 'split'],
				resource: ['pdf'],
			},
		},
		options: [
			{
				name: 'URL',
				value: 'url',
			},
			{
				name: 'Binary data',
				value: 'buffer',
			},
		],
		default: '',
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['count', 'split'],
				resource: ['pdf'],
				datatype: ['url'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'Binary data',
		name: 'buffer',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['count', 'split'],
				resource: ['pdf'],
				datatype: ['buffer'],
			},
		},
		default: '',
		description: '',
	},
	// pdf: split
	{
		displayName: 'How do you want to split the PDF?',
		name: 'splitmethod',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: ['split'],
				resource: ['pdf'],
			},
		},
		options: [
			{
				name: 'Page ranges',
				value: 'pageranges',
			},
			{
				name: 'Interval',
				value: 'interval',
			},
		],
		default: '',
		description: 'Either split by page ranges or interval.',
	},
	{
		displayName: 'Page Ranges',
		name: 'pages',
		type: 'fixedCollection',
		required: true,
		default: '',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: ['split'],
				resource: ['pdf'],
				splitmethod: ['pageranges'],
			},
		},
		description: 'Specify the page ranges to split the pdf into.',
		options: [
			{
				name: 'range',
				values: [
					{
						displayName: 'Start page',
						name: 'startPage',
						type: 'number',
						default: 0,
					},
					{
						displayName: 'End page',
						name: 'endPage',
						type: 'number',
						default: 0,
					},
				],
			},
		],
	},
	{
		displayName: 'Interval',
		name: 'interval',
		type: 'number',
		required: true,
		displayOptions: {
			show: {
				operation: ['split'],
				resource: ['pdf'],
				splitmethod: ['interval'],
			},
		},
		default: 1,
	},
	// pdf: merge
	{
		displayName: 'Files to Merge',
		name: 'files',
		type: 'collection',
		required: true,
		default: '',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: ['merge'],
				resource: ['pdf'],
			},
		},
		description: '',
		options: [
			{
				name: 'files',
				values: [
					{
						displayName: 'File Url or binary data',
						name: 'filetype',
						type: 'string',
						default: '',
						description: 'URL of the PDF file or the raw binary data',
					},
					{
						displayName: 'Page Ranges',
						name: 'pages',
						type: 'fixedCollection',
						default: '',
						typeOptions: {
							multipleValues: true,
						},
						description: 'Specify the page ranges to split the pdf into.',
						options: [
							{
								name: 'range',
								values: [
									{
										displayName: 'Start page',
										name: 'startPage',
										type: 'number',
										default: 0,
									},
									{
										displayName: 'End page',
										name: 'endPage',
										type: 'number',
										default: 0,
									},
								],
							},
						],
					},
				],
			},
		],
	},
	// pdf: html
	{
		displayName: 'URL or HTML Code',
		name: 'htmlSource',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				operation: ['html'],
				resource: ['pdf'],
			},
		},
		options: [
			{
				name: 'URL',
				value: 'url',
			},
			{
				name: 'HTML',
				value: 'html',
			},
		],
		default: '',
	},
	{
		displayName: 'URL',
		name: 'htmlUrl',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				operation: ['html'],
				resource: ['pdf'],
				htmlSource: ['url'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'HTML Code',
		name: 'htmlCode',
		type: 'string',
		required: true,
		typeOptions: {
			rows: 4,
		},
		displayOptions: {
			show: {
				operation: ['html'],
				resource: ['pdf'],
				htmlSource: ['html'],
			},
		},
		default: '',
		description: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				operation: ['html'],
				resource: ['pdf'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'PDF format',
				name: 'format ',
				type: 'options',
				options: [
					{
						name: 'Letter',
						value: 'Letter',
					},
					{
						name: 'Legal',
						value: 'Legal',
					},
					{
						name: 'Tabloid',
						value: 'Tabloid',
					},
					{
						name: 'Ledger',
						value: 'Ledger',
					},
					{
						name: 'A0',
						value: 'A0',
					},
					{
						name: 'A1',
						value: 'A1',
					},
					{
						name: 'A2',
						value: 'A2',
					},
					{
						name: 'A3',
						value: 'A3',
					},
					{
						name: 'A4',
						value: 'A4',
					},
					{
						name: 'A5',
						value: 'A5',
					},
					{
						name: 'A6',
						value: 'A6',
					},
				],
				default: 'Letter',
				description: 'Paper format. Defaults to Letter.',
			},
			{
				displayName: 'Scale',
				name: 'scale',
				type: 'number',
				default: 1,
				description:
					'Scale of the webpage rendering. Defaults to 1. Scale amount must be between 0.1 and 2.',
			},
			{
				displayName: 'Landscape',
				name: 'landscape',
				type: 'boolean',
				default: false,
				description: 'Paper orientation. Defaults to false.',
			},
			{
				displayName: 'Print background graphics',
				name: 'printBackground',
				type: 'boolean',
				default: false,
			},
		],
	},
	{
		displayName: 'Get file as URL',
		name: 'getAsUrl',
		type: 'boolean',
		required: true,
		displayOptions: {
			show: {
				operation: ['html', 'merge'],
				resource: ['pdf'],
			},
		},
		default: false,
		description: 'Get the result back as an url',
	},
] as INodeProperties[];
