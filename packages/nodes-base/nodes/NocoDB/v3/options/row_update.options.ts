import { INodeProperties, updateDisplayOptions } from 'n8n-workflow';
import { DataToSendOption, RowCreateUpdateOptions } from './row_create_update.options';

const _rowUpdateOptions: INodeProperties[] = [
	...DataToSendOption,
	{
		displayName: 'This operation requires the primary key to be included for each row.',
		name: 'info',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				dataToSend: ['autoMapInputData', 'defineBelow'],
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
		displayOptions: {
			show: {
				version: [4],
			},
		},
	},

	...RowCreateUpdateOptions,

	{
		displayName: 'Fields to Send',
		name: 'fieldsMapper',
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		displayOptions: {
			show: {
				dataToSend: ['mapWithFields'],
			},
		},

		required: true,
		noDataExpression: true,
		typeOptions: {
			loadOptionsDependsOn: ['table.value'],
			resourceMapper: {
				resourceMapperMethod: 'getResouceMapperFields',
				mode: 'add',
				fieldWords: {
					singular: 'column',
					plural: 'columns',
				},
				addAllFields: true,
				supportAutoMap: false,
			},
		},
	},
];

export const RowUpdateOptions = updateDisplayOptions(
	{
		show: {
			resource: ['row'],
			operation: ['update'],
		},
	},
	_rowUpdateOptions,
);
