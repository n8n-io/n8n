import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest, pipedriveGetCustomProperties } from '../../transport';
import { resolveCustomFieldsV2 } from '../../helpers';
import { rawCustomFieldOutputOption } from '../common.description';

const properties: INodeProperties[] = [
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'number',
		default: 0,
		required: true,
		description: 'ID of the deal to get',
	},
	rawCustomFieldOutputOption,
];

const displayOptions = {
	show: {
		resource: ['deal'],
		operation: ['get'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const rawOutput = this.getNodeParameter('rawCustomFieldOutput', 0, false) as boolean;
	let customProperties;
	if (!rawOutput) {
		customProperties = await pipedriveGetCustomProperties.call(this, 'deal');
	}

	for (let i = 0; i < items.length; i++) {
		try {
			const dealId = this.getNodeParameter('dealId', i) as number;

			const responseData = await pipedriveApiRequest.call(this, 'GET', `/deals/${dealId}`, {});

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData.data as IDataObject),
				{ itemData: { item: i } },
			);

			if (customProperties) {
				for (const item of executionData) {
					resolveCustomFieldsV2(customProperties, item);
				}
			}

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
