import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest, pipedriveGetCustomProperties } from '../../transport';
import {
	encodeCustomFieldsV2,
	resolveCustomFieldsV2,
	coerceToNumber,
	toRfc3339,
	addFieldsToBody,
} from '../../helpers';
import {
	customFieldsCollection,
	rawCustomFieldKeysOption,
	visibleToOption,
} from '../common.description';

const properties: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		description: 'The title of the deal to create',
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
		required: true,
		description: 'Type of entity to link to this deal',
	},
	{
		displayName: 'Organization ID',
		name: 'org_id',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				associateWith: ['organization'],
			},
		},
		description: 'ID of the organization this deal will be associated with',
	},
	{
		displayName: 'Person ID',
		name: 'person_id',
		type: 'number',
		default: 0,
		required: true,
		displayOptions: {
			show: {
				associateWith: ['person'],
			},
		},
		description: 'ID of the person this deal will be associated with',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Currency',
				name: 'currency',
				type: 'string',
				default: 'USD',
				description:
					'Currency of the deal. Accepts a 3-character currency code. Like EUR, USD, ...',
			},
			{
				displayName: 'Expected Close Date',
				name: 'expected_close_date',
				type: 'dateTime',
				default: '',
				description: 'The expected close date of the deal in YYYY-MM-DD format',
			},
			{
				displayName: 'Label Names or IDs',
				name: 'label_ids',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getDealLabels',
				},
				default: [],
			},
			{
				displayName: 'Lost Reason',
				name: 'lost_reason',
				type: 'string',
				default: '',
				description: 'Reason why the deal was lost',
			},
			{
				displayName: 'Organization ID',
				name: 'org_id',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						'/associateWith': ['person'],
					},
				},
				description: 'ID of the organization this deal will be associated with',
			},
			{
				displayName: 'Person ID',
				name: 'person_id',
				type: 'number',
				default: 0,
				displayOptions: {
					show: {
						'/associateWith': ['organization'],
					},
				},
				description: 'ID of the person this deal will be associated with',
			},
			{
				displayName: 'Probability',
				name: 'probability',
				type: 'number',
				typeOptions: {
					minValue: 0,
					maxValue: 100,
				},
				default: 0,
				description: 'Deal success probability percentage',
			},
			{
				displayName: 'Stage Name or ID',
				name: 'stage_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getStageIds',
				},
				default: '',
				description:
					'ID of the stage this deal will be placed in a pipeline. If omitted, the deal will be placed in the first stage of the default pipeline. (PIPELINE > STAGE). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{
						name: 'Open',
						value: 'open',
					},
					{
						name: 'Won',
						value: 'won',
					},
					{
						name: 'Lost',
						value: 'lost',
					},
					{
						name: 'Deleted',
						value: 'deleted',
					},
				],
				default: 'open',
				description:
					'The status of the deal. If not provided it will automatically be set to "open".',
			},
			{
				displayName: 'User Name or ID',
				name: 'user_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUserIds',
				},
				default: '',
				description:
					'ID of the active user whom the deal will be assigned to. If omitted, the deal will be assigned to the authorized user. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'number',
				default: 0,
				description: 'Value of the deal. If not set it will automatically be set to 0.',
			},
			visibleToOption,
			customFieldsCollection,
		],
	},
	rawCustomFieldKeysOption,
];

const displayOptions = {
	show: {
		resource: ['deal'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const rawKeys = this.getNodeParameter('rawCustomFieldKeys', 0, false) as boolean;
	let customProperties;
	if (!rawKeys) {
		customProperties = await pipedriveGetCustomProperties.call(this, 'deal');
	}

	for (let i = 0; i < items.length; i++) {
		try {
			const body: IDataObject = {};

			body.title = this.getNodeParameter('title', i) as string;

			const associateWith = this.getNodeParameter('associateWith', i) as 'organization' | 'person';

			if (associateWith === 'organization') {
				body.org_id = this.getNodeParameter('org_id', i) as number;
			} else {
				body.person_id = this.getNodeParameter('person_id', i) as number;
			}

			const additionalFields = this.getNodeParameter('additionalFields', i);
			addFieldsToBody(body, additionalFields);

			if (body.expected_close_date) {
				body.expected_close_date = toRfc3339(body.expected_close_date as string);
			}
			if (body.value !== undefined) {
				body.value = coerceToNumber(body.value);
			}
			if (body.probability !== undefined) {
				body.probability = coerceToNumber(body.probability);
			}

			if (customProperties) {
				encodeCustomFieldsV2(customProperties, body);
			}

			const responseData = await pipedriveApiRequest.call(this, 'POST', '/deals', body);

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
