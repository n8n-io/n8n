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
	recordRLC('Contact', 'contactId', 'searchContacts', 'Contact to update'),
	{
		displayName: 'Fields to Update',
		name: 'fieldsToSend',
		type: 'resourceMapper',
		default: { mappingMode: 'defineBelow', value: null },
		noDataExpression: true,
		required: true,
		typeOptions: {
			loadOptionsDependsOn: ['resource', 'operation'],
			resourceMapper: {
				resourceMapperMethod: 'getContactFields',
				mode: 'update',
				fieldWords: { singular: 'field', plural: 'fields' },
				addAllFields: false,
			},
		},
	},
];

const displayOptions = {
	show: { resource: ['contact'], operation: ['update'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const contactId = this.getNodeParameter('contactId', i, undefined, {
				extractValue: true,
			}) as number;
			const mappingMode = this.getNodeParameter('fieldsToSend.mappingMode', i) as string;

			let vals: IDataObject;
			if (mappingMode === 'autoMapInputData') {
				vals = items[i].json;
			} else {
				vals = this.getNodeParameter('fieldsToSend.value', i, {}) as IDataObject;
			}

			await odooApiRequest.call(this, 'res.partner', 'write', { ids: [contactId], vals });

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ id: contactId, updated: true }),
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
