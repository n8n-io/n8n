import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest, pipedriveGetCustomProperties } from '../../transport';
import { resolveCustomFieldsV2 } from '../../helpers';
import { organizationIncludeFieldsOption, rawCustomFieldOutputOption } from '../common.description';

const properties: INodeProperties[] = [
	{
		displayName: 'Organization ID',
		name: 'organizationId',
		type: 'number',
		default: 0,
		required: true,
		description: 'ID of the organization to get',
	},
	organizationIncludeFieldsOption,
	rawCustomFieldOutputOption,
];

const displayOptions = {
	show: {
		resource: ['organization'],
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
		customProperties = await pipedriveGetCustomProperties.call(this, 'organization');
	}

	for (let i = 0; i < items.length; i++) {
		try {
			const organizationId = this.getNodeParameter('organizationId', i) as number;

			const includeFields = this.getNodeParameter('includeFields', i, []) as string[];
			const qs: IDataObject = {};
			if (includeFields.length) {
				qs.include_fields = includeFields.join(',');
			}

			const responseData = await pipedriveApiRequest.call(
				this,
				'GET',
				requestPath`/organizations/${organizationId}`,
				{},
				qs,
			);

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
