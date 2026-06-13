import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { odooApiRequest } from '../../transport';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	{
		displayName: 'Fields to Send',
		name: 'fieldsToSend',
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		noDataExpression: true,
		required: true,
		typeOptions: {
			loadOptionsDependsOn: ['resource', 'operation'],
			resourceMapper: {
				resourceMapperMethod: 'getOpportunityFields',
				mode: 'add',
				fieldWords: {
					singular: 'field',
					plural: 'fields',
				},
				addAllFields: false,
			},
		},
	},
];

const displayOptions = {
	show: { resource: ['opportunity'], operation: ['create'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const mappingMode = this.getNodeParameter('fieldsToSend.mappingMode', i) as string;

			let fields: IDataObject;
			if (mappingMode === 'autoMapInputData') {
				fields = items[i].json;
			} else {
				fields = this.getNodeParameter('fieldsToSend.value', i, {}) as IDataObject;
			}

			const result = (await odooApiRequest.call(this, 'crm.lead', 'create', {
				vals_list: [fields],
			})) as unknown as number | number[];
			const id = Array.isArray(result) ? result[0] : result;

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ id }),
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
