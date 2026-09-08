import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest } from '../../transport';
import { visibleToOption } from '../common.description';
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
		displayName: 'Update fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add field',
		default: {},
		options: [
			{
				displayName: 'Expected close date',
				name: 'expected_close_date',
				type: 'dateTime',
				default: '',
				description: "Expected close date for this lead's deal (YYYY-MM-DD)",
			},
			{
				displayName: 'Is archived',
				name: 'is_archived',
				type: 'boolean',
				default: false,
				description: 'Whether the lead is archived',
			},
			{
				displayName: 'Label names or IDs',
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
				displayName: 'Owner name or ID',
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
				displayName: 'Person name or ID',
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
						displayName: 'Value properties',
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
				displayName: 'Was seen',
				name: 'was_seen',
				type: 'boolean',
				default: false,
				description: 'Whether the lead was seen by someone in the Pipedrive UI',
			},
		],
	},
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

	for (let i = 0; i < items.length; i++) {
		try {
			const leadId = this.getNodeParameter('leadId', i) as string;

			const { value, expected_close_date, ...rest } = this.getNodeParameter('updateFields', i) as {
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
				Object.assign(body, rest);
			}

			if (value) {
				Object.assign(body, { value: value.valueProperties });
			}

			if (expected_close_date) {
				body.expected_close_date = expected_close_date.split('T')[0];
			}

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
