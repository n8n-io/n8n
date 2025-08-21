import { INodeProperties, updateDisplayOptions } from 'n8n-workflow';

export const _rowGetOptions: INodeProperties[] = [
	{
		displayName: 'Row ID Value',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		description: 'The value of the ID field',
	},
	{
		displayName: 'Download Attachments',
		name: 'downloadAttachments',
		type: 'boolean',
		default: false,
		description: "Whether the attachment fields define in 'Download Fields' will be downloaded",
	},
	{
		displayName: 'Download Field Name or ID',
		name: 'downloadFieldNames',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getDownloadFields',
		},
		required: true,
		displayOptions: {
			show: {
				downloadAttachments: [true],
			},
		},
		default: '',
		description:
			'Name of the fields of type \'attachment\' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
];
export const RowGetOptions = updateDisplayOptions(
	{
		show: {
			resource: ['row'],
			operation: ['get'],
		},
	},
	_rowGetOptions,
);
