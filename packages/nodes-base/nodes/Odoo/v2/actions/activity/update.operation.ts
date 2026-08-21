import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { formatOdooDateFields, getModelSchema, recordRLC } from '../../helpers/utils';
import { odooApiRequest } from '../../transport';
import { updateDisplayOptions } from '../../../../../utils/utilities';

const properties: INodeProperties[] = [
	recordRLC('Activity', 'activityId', 'searchActivities', 'Activity to update'),
	{
		displayName: 'Fields to Update',
		name: 'fieldsToSend',
		type: 'resourceMapper',
		default: { mappingMode: 'defineBelow', value: null },
		noDataExpression: true,

		typeOptions: {
			loadOptionsDependsOn: ['resource', 'operation'],
			resourceMapper: {
				resourceMapperMethod: 'getActivityFields',
				mode: 'update',
				fieldWords: { singular: 'field', plural: 'fields' },
				addAllFields: false,
			},
		},
	},
];

const displayOptions = {
	show: { resource: ['activity'], operation: ['update'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const schema = await getModelSchema(this, 'mail.activity');

	for (let i = 0; i < items.length; i++) {
		try {
			const activityId = Number(
				this.getNodeParameter('activityId', i, undefined, {
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

			await odooApiRequest.call(this, 'mail.activity', 'write', {
				ids: [activityId],
				vals,
			});

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ id: activityId, updated: true }),
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
