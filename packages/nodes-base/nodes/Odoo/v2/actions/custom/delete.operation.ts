import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { recordRLC } from '../../helpers/utils';
import { odooApiRequest } from '../../transport';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	recordRLC('Record', 'recordId', 'searchCustomRecords', 'Record to delete', [
		'customResource.value',
	]),
];

const displayOptions = {
	show: { resource: ['custom'], operation: ['delete'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const model = this.getNodeParameter('customResource', i, undefined, {
				extractValue: true,
			}) as string;
			const recordId = Number(
				this.getNodeParameter('recordId', i, undefined, {
					extractValue: true,
				}),
			);

			await odooApiRequest.call(this, model, 'unlink', {
				ids: [recordId],
			});

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ id: recordId, deleted: true }),
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
