import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest, pipedriveGetCustomProperties } from '../../transport';
import { encodeCustomFieldsV2, addFieldsToBody } from '../../helpers';
import {
	customFieldsCollection,
	encodeCustomFieldsOption,
	visibleToOption,
} from '../common.description';

const properties: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		required: true,
		description: 'The name of the person to create',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
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
			visibleToOption,
			customFieldsCollection,
		],
	},
	encodeCustomFieldsOption,
];

const displayOptions = {
	show: {
		resource: ['person'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

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
			const body: IDataObject = {};

			body.name = this.getNodeParameter('name', i) as string;

			const additionalFields = this.getNodeParameter('additionalFields', i);
			addFieldsToBody(body, additionalFields);

			if (customProperties) {
				encodeCustomFieldsV2(customProperties, body);
			}

			const responseData = await pipedriveApiRequest.call(this, 'POST', '/persons', body);

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
