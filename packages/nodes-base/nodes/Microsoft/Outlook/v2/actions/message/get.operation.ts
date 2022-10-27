import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { downloadAttachments, microsoftApiRequest } from '../../transport';
import { additionalFieldsOptions } from '../commonDescrriptions';

export const description: INodeProperties[] = [
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['message'],
				operation: ['get'],
			},
		},
		options: [...additionalFieldsOptions],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	let responseData;
	const qs: IDataObject = {};

	const messageId = this.getNodeParameter('messageId', index) as string;
	const additionalFields = this.getNodeParameter('additionalFields', index) as IDataObject;

	if (additionalFields.fields) {
		qs['$select'] = additionalFields.fields;
	}

	if (additionalFields.filter) {
		qs['$filter'] = additionalFields.filter;
	}

	responseData = await microsoftApiRequest.call(
		this,
		'GET',
		`/messages/${messageId}`,
		undefined,
		qs,
	);

	if (additionalFields.dataPropertyAttachmentsPrefixName) {
		const prefix = additionalFields.dataPropertyAttachmentsPrefixName as string;
		const data = await downloadAttachments.call(this, responseData, prefix);
		return data;
	}

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData),
		{ itemData: { item: index } },
	);

	return executionData;
}
