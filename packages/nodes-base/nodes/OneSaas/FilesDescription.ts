import {
	INodeProperties,
 } from 'n8n-workflow';

export const filesOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'files',
				],
			},
		},
		options: [
			{
				name: 'Download',
				value: 'download',
				description: 'Download a file',
			},
			{
				name: 'HTML to PDF',
				value: 'htmlToPDF',
				description: 'Convert HTML to PDF',
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all saved files',
			},
			{
				name: 'PDF Merge',
				value: 'pdfMerge',
				description: 'Merge multiple pdf files to a single pdf',
			},
			{
				name: 'Temp Files',
				value: 'tempFiles',
				description: 'Upload a buffer and returns a temporary file url',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file',
			},
		],
		default: 'download',
	},
] as INodeProperties[];

export const filesFields = [] as INodeProperties[];
