import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { CUSTOMER_LOCATOR, CUSTOMER_NEED_FIELDS } from '../../../shared/constants';
import { linearApiRequest } from '../../../shared/GenericFunctions';
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
				displayName: 'Issue ID',
				name: 'issueId',
				type: 'string',
				default: '',
				description: 'The issue to attach the need to',
			},
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
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
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const customerId = this.getNodeParameter('customerId', i, '', {
				extractValue: true,
			}) as string;
			const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

			const body = {
				query: `mutation CustomerNeedCreate($customerId: String!, $body: String, $issueId: String, $projectId: String, $priority: Int) {
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

			returnData.push(
				...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(need), {
					itemData: { item: i },
				}),
			);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push(
					...this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					),
				);
				continue;
			}
			throw error;
		}
	}
	return returnData;
}
