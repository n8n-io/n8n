import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { prepareContactFields } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';
import { contactFields } from './descriptions';

export const description: INodeProperties[] = [
	{
		displayName: 'Update Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['contact'],
				operation: ['update'],
			},
		},
		options: [...contactFields],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const additionalFields = this.getNodeParameter('additionalFields', index);
	const contactId = this.getNodeParameter('contactId', index) as string;

	const body: IDataObject = prepareContactFields(additionalFields);

	const responseData = await microsoftApiRequest.call(
		this,
		'PATCH',
		`/contacts/${contactId}`,
		body,
	);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject),
		{ itemData: { item: index } },
	);

	return executionData;
}
