import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest, pipedriveGetCustomProperties } from '../../transport';
import { encodeCustomFieldsV2 } from '../../helpers';
import { customFieldsCollection, encodeCustomFieldsOption } from '../common.description';

const properties: INodeProperties[] = [
	{
		displayName: 'Person ID',
		name: 'personId',
		type: 'number',
		default: 0,
		required: true,
		description: 'ID of the person to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				description: 'Email address of the person',
			},
			{
				displayName: 'Label Name or ID',
				name: 'label',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getPersonLabels',
				},
				default: '',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The name of the person',
			},
			{
				displayName: 'Organization Name or ID',
				name: 'org_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getOrganizationIds',
				},
				default: '',
				description:
					'ID of the organization this person will belong to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
					'ID of the user who will be marked as the owner of this person. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				description: 'Phone number of the person',
			},
			{
				displayName: 'Visible To',
				name: 'visible_to',
				type: 'options',
				options: [
					{
						name: 'Owner & Followers (Private)',
						value: '1',
					},
					{
						name: 'Entire Company (Shared)',
						value: '3',
					},
				],
				default: '3',
				description:
					'Visibility of the person. If omitted, visibility will be set to the default visibility setting of this item type for the authorized user.',
			},
			customFieldsCollection,
		],
	},
	encodeCustomFieldsOption,
];

const displayOptions = {
	show: {
		resource: ['person'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

function addUpdateFields(body: IDataObject, updateFields: IDataObject): void {
	for (const key of Object.keys(updateFields)) {
		if (
			key === 'customFields' &&
			(updateFields.customFields as IDataObject)?.property !== undefined
		) {
			for (const customProperty of (updateFields.customFields as IDataObject).property as Array<{
				name: string;
				value: string;
			}>) {
				body[customProperty.name] = customProperty.value;
			}
		} else {
			body[key] = updateFields[key];
		}
	}
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const encodeCustom = this.getNodeParameter('encodeCustomFields', 0, false) as boolean;
	let customProperties;
	if (encodeCustom) {
		customProperties = await pipedriveGetCustomProperties.call(this, 'person');
	}

	for (let i = 0; i < items.length; i++) {
		try {
			const personId = this.getNodeParameter('personId', i) as number;
			const body: IDataObject = {};

			const updateFields = this.getNodeParameter('updateFields', i);
			addUpdateFields(body, updateFields);

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
				`/persons/${personId}`,
				body,
			);

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData.data as IDataObject),
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
