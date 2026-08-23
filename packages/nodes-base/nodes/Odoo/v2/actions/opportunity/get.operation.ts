import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { recordRLC } from '../../helpers/utils';
import { odooApiRequest } from '../../transport';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	recordRLC('Opportunity', 'opportunityId', 'searchOpportunities', 'Opportunity to retrieve'),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		default: {},
		placeholder: 'Add Option',
		options: [
			{
				displayName: 'Fields to Include',
				name: 'fieldsList',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				default: [],
				typeOptions: { loadOptionsMethod: 'getOpportunityFields' },
			},
		],
	},
];

const displayOptions = {
	show: { resource: ['opportunity'], operation: ['get'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const opportunityId = Number(
				this.getNodeParameter('opportunityId', i, undefined, {
					extractValue: true,
				}),
			);
			const options = this.getNodeParameter('options', i) as IDataObject;
			const fields = (options.fieldsList as string[]) ?? [];

			const response = (await odooApiRequest.call(this, 'crm.lead', 'read', {
				ids: [opportunityId],
				fields,
			})) as IDataObject[];

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(response),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			if (this.continueOnFail()) {
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray({ error: error.message }),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
				continue;
			}
			throw error;
		}
	}

	return returnData;
}
