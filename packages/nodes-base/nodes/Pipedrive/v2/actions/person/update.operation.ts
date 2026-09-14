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
				displayName: 'Emails',
				name: 'emails',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				description: 'Email addresses of the person',
				options: [
					{
						displayName: 'Email',
						name: 'emailProperties',
						values: [
							{
								displayName: 'Email',
								name: 'value',
								type: 'string',
								placeholder: 'name@email.com',
								default: '',
							},
							{
								displayName: 'Primary',
								name: 'primary',
								type: 'boolean',
								default: true,
								description: 'Whether this is the primary email address',
							},
							{
								displayName: 'Label',
								name: 'label',
								type: 'options',
								options: [
									{ name: 'Home', value: 'home' },
									{ name: 'Work', value: 'work' },
									{ name: 'Other', value: 'other' },
								],
								default: 'work',
							},
						],
					},
				],
			},
			{
				displayName: 'Label Names or IDs',
				name: 'label_ids',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getPersonLabels',
				},
				default: [],
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
				displayName: 'Phones',
				name: 'phones',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				default: {},
				description: 'Phone numbers of the person',
				options: [
					{
						displayName: 'Phone',
						name: 'phoneProperties',
						values: [
							{
								displayName: 'Phone Number',
								name: 'value',
								type: 'string',
								default: '',
							},
							{
								displayName: 'Primary',
								name: 'primary',
								type: 'boolean',
								default: true,
								description: 'Whether this is the primary phone number',
							},
							{
								displayName: 'Label',
								name: 'label',
								type: 'options',
								options: [
									{ name: 'Home', value: 'home' },
									{ name: 'Mobile', value: 'mobile' },
									{ name: 'Work', value: 'work' },
									{ name: 'Other', value: 'other' },
								],
								default: 'mobile',
							},
						],
					},
				],
			},
			visibleToOption,
			customFieldsCollection,
		],
	},
	rawCustomFieldKeysOption,
];

const displayOptions = {
	show: {
		resource: ['person'],
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
		customProperties = await pipedriveGetCustomProperties.call(this, 'person');
	}

	for (let i = 0; i < items.length; i++) {
		try {
			const personId = this.getNodeParameter('personId', i) as number;
			const body: IDataObject = {};

			const updateFields = this.getNodeParameter('updateFields', i);
			addFieldsToBody(body, updateFields);

			// Transform fixedCollection emails to API array format
			if (body.emails && (body.emails as IDataObject).emailProperties) {
				body.emails = (body.emails as IDataObject).emailProperties;
			}
			// Transform fixedCollection phones to API array format
			if (body.phones && (body.phones as IDataObject).phoneProperties) {
				body.phones = (body.phones as IDataObject).phoneProperties;
			}

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
