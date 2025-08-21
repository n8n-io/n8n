import { INodeProperties, updateDisplayOptions } from 'n8n-workflow';

export const _rowDeleteOptions: INodeProperties[] = [
	{
		displayName: 'Primary Key Type',
		name: 'primaryKey',
		type: 'options',
		default: 'id',
		displayOptions: {
			show: {
				version: [3],
			},
		},
		options: [
			{
				name: 'Default',
				value: 'id',
				description:
					'Default, added when table was created from UI by those options: Create new table / Import from Excel / Import from CSV',
			},
			{
				name: 'Imported From Airtable',
				value: 'ncRecordId',
				description: 'Select if table was imported from Airtable',
			},
			{
				name: 'Custom',
				value: 'custom',
				description:
					'When connecting to existing external database as existing primary key field is retained as is, enter the name of the primary key field below',
			},
		],
	},
	{
		displayName: 'Field Name',
		name: 'customPrimaryKey',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				primaryKey: ['custom'],
				version: [3],
			},
		},
	},
	{
		displayName: 'Row ID Value',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		description: 'The value of the ID field',
	},
];
export const RowDeleteOptions = updateDisplayOptions(
	{
		show: {
			resource: ['row'],
			operation: ['delete'],
		},
	},
	_rowDeleteOptions,
);
