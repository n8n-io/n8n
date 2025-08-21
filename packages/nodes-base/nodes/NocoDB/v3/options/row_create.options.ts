import { INodeProperties, updateDisplayOptions } from 'n8n-workflow';
import { DataToSendOption, RowCreateUpdateOptions } from './row_create_update.options';

const _rowCreateOptions: INodeProperties[] = [
	...DataToSendOption,
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

export const RowCreateOptions = updateDisplayOptions(
	{
		show: {
			resource: ['row'],
			operation: ['create'],
		},
	},
	_rowCreateOptions,
);
