import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest, pipedriveGetCustomProperties } from '../../transport';
import { encodeCustomFieldsV2, resolveCustomFieldsV2, addFieldsToBody } from '../../helpers';
import {
	customFieldsCollection,
	rawCustomFieldKeysOption,
	visibleToOption,
} from '../common.description';

const properties: INodeProperties[] = [
	{
		displayName: 'Organization ID',
		name: 'organizationId',
		type: 'number',
		default: 0,
		required: true,
		description: 'ID of the organization to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Label Names or IDs',
				name: 'label_ids',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getOrganizationLabels',
				},
				default: [],
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the organization',
			},
			{
				displayName: 'Owner Name or ID',
				name: 'owner_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUserIds',
				},
				default: '',
				description:
					'ID of the user who will be marked as the owner of this organization. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			visibleToOption,
			customFieldsCollection,
		],
	},
	rawCustomFieldKeysOption,
];

const displayOptions = {
	show: {
		resource: ['organization'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const rawKeys = this.getNodeParameter('rawCustomFieldKeys', 0, false) as boolean;
	let customProperties;
	if (!rawKeys) {
		customProperties = await pipedriveGetCustomProperties.call(this, 'organization');
	}

	for (let i = 0; i < items.length; i++) {
		try {
			const organizationId = this.getNodeParameter('organizationId', i) as number;
			const body: IDataObject = {};

			const updateFields = this.getNodeParameter('updateFields', i);
			addFieldsToBody(body, updateFields);

			// Clear label when set to 'null' string
			if (body.label === 'null') {
				body.label = null;
			}

			if (customProperties) {
				encodeCustomFieldsV2(customProperties, body);
			}

			// v2 API uses PATCH for updates (not PUT)
			const responseData = await pipedriveApiRequest.call(
				this,
				'PATCH',
				`/organizations/${organizationId}`,
				body,
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
