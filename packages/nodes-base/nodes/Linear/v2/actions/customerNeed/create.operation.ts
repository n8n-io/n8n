import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

import {
	CUSTOMER_LOCATOR,
	CUSTOMER_NEED_FIELDS,
	ISSUE_LOCATOR,
	PROJECT_LOCATOR,
} from '../../../shared/constants';
import { extractLocatorIds, linearApiRequest } from '../../../shared/GenericFunctions';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	CUSTOMER_LOCATOR,
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Body',
				name: 'body',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
				description: 'The content describing the need',
			},
			{
				...ISSUE_LOCATOR,
				required: false,
				description: 'The issue to attach the need to',
			},
			{
				...PROJECT_LOCATOR,
				required: false,
				description: 'The project to attach the need to',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'number',
				default: 0,
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['customerNeed'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const customerId = this.getNodeParameter('customerId', i, '', {
		extractValue: true,
	}) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
	extractLocatorIds(this, additionalFields, 'additionalFields', i);

	const body = {
		query: `mutation CustomerNeedCreate($customerId: String!, $body: String, $issueId: String, $projectId: String, $priority: Float) {
			customerNeedCreate(input: {
				customerId: $customerId
				body: $body
				issueId: $issueId
				projectId: $projectId
				priority: $priority
			}) {
				success
				need {
					${CUSTOMER_NEED_FIELDS}
				}
			}
		}`,
		variables: { customerId, ...additionalFields },
	};

	const responseData = await linearApiRequest.call(this, body);
	const need = (responseData as { data: { customerNeedCreate: { need: IDataObject } } }).data
		.customerNeedCreate?.need;

	return need;
}
