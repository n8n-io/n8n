import type { IExecuteFunctions } from 'n8n-core';
import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../../../utils/utilities';
import { additionalFieldsCollection } from '../common.descriptions';

const properties: INodeProperties[] = [
	{
		displayName: 'Schema',
		name: 'schema',
		type: 'string',
		default: 'public',
		description: 'Name of the schema the table belongs to',
	},
	{
		displayName: 'Table',
		name: 'table',
		type: 'string',
		default: '',
		required: true,
		description: 'Name of the table in which to update data in',
	},
	{
		displayName: 'Update Key',
		name: 'updateKey',
		type: 'string',
		default: 'id',
		required: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description:
			'Comma-separated list of the properties which decides which rows in the database should be updated. Normally that would be "id".',
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		default: '',
		placeholder: 'name:text,description',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description:
			'Comma-separated list of the properties which should used as columns for rows to update. You can use type casting with colons (:) like id:int.',
	},
	{
		displayName: 'Return Fields',
		name: 'returnFields',
		type: 'string',
		requiresDataPath: 'multiple',
		default: '*',
		description: 'Comma-separated list of the fields that the operation will return',
	},
	additionalFieldsCollection,
];

const displayOptions = {
	show: {
		resource: ['database'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	return returnData;
}
