import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { createMessage } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
import { updateFieldsOptions } from '../commonDescrriptions';

export const description: INodeProperties[] = [
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['update'],
			},
		},
		options: [...updateFieldsOptions],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	let responseData;

	const messageId = this.getNodeParameter('messageId', index) as string;

	const updateFields = this.getNodeParameter('updateFields', index) as IDataObject;

	// Create message from optional fields
	const body: IDataObject = createMessage(updateFields);

	responseData = await microsoftApiRequest.call(this, 'PATCH', `/messages/${messageId}`, body, {});

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}
