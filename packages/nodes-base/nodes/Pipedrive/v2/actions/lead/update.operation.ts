import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import type { ICustomProperties } from '../../transport';
import { pipedriveApiRequest, pipedriveGetCustomProperties } from '../../transport';
import {
	encodeCustomFieldsV2,
	resolveCustomFieldsV2,
	addFieldsToBody,
	flattenCustomFieldsToRoot,
	nestRootCustomFields,
} from '../../helpers';
import {
	customFieldsCollection,
	rawCustomFieldKeysOption,
	visibleToOption,
} from '../common.description';
import { currencies } from '../../../utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Lead ID',
		name: 'leadId',
		description: 'ID of the lead to update',
		type: 'string',
		required: true,
		default: '',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Expected Close Date',
				name: 'expected_close_date',
				type: 'dateTime',
				default: '',
				description: "Expected close date for this lead's deal (YYYY-MM-DD)",
			},
			{
				displayName: 'Is Archived',
				name: 'is_archived',
				type: 'boolean',
				default: false,
				description: 'Whether the lead is archived',
			},
			{
				displayName: 'Label Names or IDs',
				name: 'label_ids',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLeadLabels',
				},
				default: [],
				description:
					'ID of the labels to attach to the lead to update. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
					'ID of the user who will own the lead to update. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Person Name or ID',
				name: 'person_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPersons',
				},
				default: '',
				description:
					'ID of the person to link to this lead. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Name of the lead to update',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'fixedCollection',
				description: 'Potential monetary value associated with the lead',
				default: {},
				options: [
					{
						displayName: 'Value Properties',
						name: 'valueProperties',
						values: [
							{
								displayName: 'Amount',
								name: 'amount',
								type: 'number',
								default: '',
							},
							{
								displayName: 'Currency',
								name: 'currency',
								type: 'options',
								default: 'USD',
								options: currencies.sort((a, b) => a.name.localeCompare(b.name)),
							},
						],
					},
				],
			},
			visibleToOption,
			{
				displayName: 'Was Seen',
				name: 'was_seen',
				type: 'boolean',
				default: false,
				description: 'Whether the lead was seen by someone in the Pipedrive UI',
			},
			customFieldsCollection,
		],
	},
	rawCustomFieldKeysOption,
];

const displayOptions = {
	show: {
		resource: ['lead'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	// Resolving custom field keys/IDs to human-readable names on output was added
	// after v2 shipped without lead custom field support. Gate it to v2.1+ so leads
	// created on v2 keep the raw Pipedrive keys they returned before.
	const resolveOutput = this.getNode().typeVersion >= 2.1;

	const rawKeys = this.getNodeParameter('rawCustomFieldKeys', 0, false) as boolean;
	// Fetch the lead field metadata once, but surface a failure through the
	// per-item error path below so `continueOnFail` keeps working.
	let customProperties: ICustomProperties | undefined;
	let customPropertiesError: Error | undefined;
	if (!rawKeys) {
		try {
			customProperties = await pipedriveGetCustomProperties.call(this, 'lead');
		} catch (error) {
			if (!this.continueOnFail()) throw error;
			customPropertiesError = error as Error;
		}
	}

	for (let i = 0; i < items.length; i++) {
		try {
			if (customPropertiesError) throw customPropertiesError;

			const leadId = this.getNodeParameter('leadId', i) as string;

			const updateFields = this.getNodeParameter('updateFields', i);
			const { value, expected_close_date, ...rest } = updateFields as {
				value?: {
					valueProperties: {
						amount: number;
						currency: string;
					};
				};
				expected_close_date?: string;
				[key: string]: unknown;
			};

			const body: IDataObject = {};

			if (Object.keys(rest).length) {
				addFieldsToBody(body, rest as IDataObject);
			}

			if (value) {
				Object.assign(body, { value: value.valueProperties });
			}

			if (expected_close_date) {
				body.expected_close_date = expected_close_date.split('T')[0];
			}

			if (customProperties) {
				encodeCustomFieldsV2(customProperties, body);
			}
			// The v1 Leads endpoint takes custom fields as top-level keys, not nested.
			flattenCustomFieldsToRoot(body);

			const responseData = await pipedriveApiRequest.call(
				this,
				'PUT',
				`/leads/${leadId}`,
				body,
				{},
				{ apiVersion: 'v1' },
			);

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData.data as IDataObject),
				{ itemData: { item: i } },
			);

			if (customProperties && resolveOutput) {
				for (const item of executionData) {
					// v1 returns custom fields at the root; nest them so the shared
					// resolver can map keys/IDs to human-readable names.
					nestRootCustomFields(customProperties, item);
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
