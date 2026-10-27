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
		displayName: 'Title',
		name: 'title',
		description: 'Name of the lead to create',
		type: 'string',
		required: true,
		default: '',
	},
	{
		displayName: 'Associate With',
		name: 'associateWith',
		type: 'options',
		options: [
			{
				name: 'Organization',
				value: 'organization',
			},
			{
				name: 'Person',
				value: 'person',
			},
		],
		default: 'organization',
		description: 'Type of entity to link to this lead',
		required: true,
	},
	{
		displayName: 'Organization ID',
		name: 'organization_id',
		type: 'number',
		default: 0,
		description: 'ID of the organization to link to this lead',
		required: true,
		displayOptions: {
			show: {
				associateWith: ['organization'],
			},
		},
	},
	{
		displayName: 'Person ID',
		name: 'person_id',
		type: 'number',
		default: 0,
		description: 'ID of the person to link to this lead',
		required: true,
		displayOptions: {
			show: {
				associateWith: ['person'],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
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
				displayName: 'Label Names or IDs',
				name: 'label_ids',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getLeadLabels',
				},
				default: [],
				description:
					'ID of the labels to attach to the lead to create. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Organization ID',
				name: 'organization_id',
				type: 'number',
				default: 0,
				description: 'ID of the organization to link to this lead',
				displayOptions: {
					show: {
						'/associateWith': ['person'],
					},
				},
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
					'ID of the user who will own the lead to create. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Person ID',
				name: 'person_id',
				type: 'number',
				default: 0,
				description: 'ID of the person to link to this lead',
				displayOptions: {
					show: {
						'/associateWith': ['organization'],
					},
				},
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
		],
	},
];

const displayOptions = {
	show: {
		resource: ['lead'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const body: IDataObject = {
				title: this.getNodeParameter('title', i) as string,
			};

			const associateWith = this.getNodeParameter('associateWith', i) as 'organization' | 'person';

			if (associateWith === 'organization') {
				body.organization_id = this.getNodeParameter('organization_id', i) as number;
			} else {
				body.person_id = this.getNodeParameter('person_id', i) as number;
			}

			const { value, expected_close_date, ...rest } = this.getNodeParameter(
				'additionalFields',
				i,
			) as {
				value?: {
					valueProperties: {
						amount: number;
						currency: string;
					};
				};
				expected_close_date?: string;
				[key: string]: unknown;
			};

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
				'POST',
				'/leads',
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
