import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'number',
		default: 0,
		required: true,
		description: 'ID of the deal to delete',
	},
];

const displayOptions = {
	show: {
		resource: ['deal'],
		operation: ['delete'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const dealId = this.getNodeParameter('dealId', i) as number;

			await pipedriveApiRequest.call(this, 'DELETE', `/deals/${dealId}`, {});

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ success: true } as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
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
