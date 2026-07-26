import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { recordRLC } from '../../helpers/utils';
import { odooApiRequest } from '../../transport';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	recordRLC('Opportunity', 'opportunityId', 'searchOpportunities', 'Opportunity to delete'),
];

const displayOptions = {
	show: { resource: ['opportunity'], operation: ['delete'] },
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

			await odooApiRequest.call(this, 'crm.lead', 'unlink', { ids: [opportunityId] });

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ id: opportunityId, deleted: true }),
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
