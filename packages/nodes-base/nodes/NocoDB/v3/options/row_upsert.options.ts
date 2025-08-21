import { INodeProperties, updateDisplayOptions } from 'n8n-workflow';
import { DataToSendOption, RowCreateUpdateOptions } from './row_create_update.options';

const _rowUpsertOptions: INodeProperties[] = [
	...DataToSendOption,
	{
		displayName: 'Row ID Value',
		name: 'id',
		type: 'string',
		default: '',
		description: 'The value of the ID field. Keep empty for create (insert).',
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
			loadOptionsDependsOn: ['version', 'workspaceId', 'projectId', 'table', 'dataToSend'],
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

export const RowUpsertOptions = updateDisplayOptions(
	{
		show: {
			resource: ['row'],
			operation: ['upsert'],
		},
	},
	_rowUpsertOptions,
);
