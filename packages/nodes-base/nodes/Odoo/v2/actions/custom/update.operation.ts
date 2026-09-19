import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import {
	formatOdooDateFields,
	getModelSchema,
	recordRLC,
	type OdooFieldSchema,
} from '../../helpers/utils';
import { odooApiRequest } from '../../transport';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	recordRLC('Record', 'recordId', 'searchCustomRecords', 'Record to update', [
		'customResource.value',
	]),
	{
		displayName: 'Fields to Update',
		name: 'fieldsToSend',
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		noDataExpression: true,
		typeOptions: {
			loadOptionsDependsOn: ['resource', 'operation', 'customResource.value'],
			resourceMapper: {
				resourceMapperMethod: 'getOdooFields',
				mode: 'update',
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
	show: { resource: ['custom'], operation: ['update'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	// Cache schemas per model so expressions that vary per item don't trigger
	// redundant fields_get calls, while still resolving the correct model for each item.
	const schemaCache = new Map<string, OdooFieldSchema>();

	for (let i = 0; i < items.length; i++) {
		try {
			const model = this.getNodeParameter('customResource', i, undefined, {
				extractValue: true,
			}) as string;

			if (!schemaCache.has(model)) {
				schemaCache.set(model, await getModelSchema(this, model));
			}
			const schema = schemaCache.get(model)!;

			const recordId = Number(
				this.getNodeParameter('recordId', i, undefined, {
					extractValue: true,
				}),
			);

			const mappingMode = this.getNodeParameter('fieldsToSend.mappingMode', i) as string;

			let vals: IDataObject;
			if (mappingMode === 'autoMapInputData') {
				vals = items[i].json;
			} else {
				vals = this.getNodeParameter('fieldsToSend.value', i, {}) as IDataObject;
			}

			vals = formatOdooDateFields(vals, schema);

			await odooApiRequest.call(this, model, 'write', {
				ids: [recordId],
				vals,
			});

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ id: recordId, updated: true }),
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
