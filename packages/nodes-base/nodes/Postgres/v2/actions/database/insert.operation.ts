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
		required: true,
		description: 'Name of the schema the table belongs to',
	},
	{
		displayName: 'Table',
		name: 'table',
		type: 'string',
		default: '',
		required: true,
		description: 'Name of the table in which to insert data to',
	},
	{
		displayName: 'Columns',
		name: 'columns',
		type: 'string',
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
		placeholder: 'id:int,name:text,description',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
		description:
			'Comma-separated list of the properties which should used as columns for the new rows. You can use type casting with colons (:) like id:int.',
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
		operation: ['insert'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	return returnData;
}
