import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../utils/utilities';
import { pipedriveApiRequest, pipedriveGetCustomProperties } from '../../transport';
import { encodeCustomFieldsV2, coerceToBoolean } from '../../helpers';
import { customFieldsCollection } from '../common.description';

const properties: INodeProperties[] = [
	{
		displayName: 'Subject',
		name: 'subject',
		type: 'string',
		default: '',
		required: true,
		description: 'The subject of the activity to create',
	},
	{
		displayName: 'Done',
		name: 'done',
		type: 'options',
		options: [
			{
				name: 'Not Done',
				value: '0',
			},
			{
				name: 'Done',
				value: '1',
			},
		],
		default: '0',
		description: 'Whether the activity is done or not',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'call',
		description: 'Type of the activity like "call", "meeting", etc',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Deal ID',
				name: 'deal_id',
				type: 'number',
				default: 0,
				description: 'ID of the deal this activity will be associated with',
			},
			{
				displayName: 'Due Date',
				name: 'due_date',
				type: 'dateTime',
				default: '',
				description: 'Due Date to activity be done YYYY-MM-DD',
			},
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				description: 'Note of the activity (HTML format)',
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
					'ID of the organization this activity will be associated with. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Person ID',
				name: 'person_id',
				type: 'number',
				default: 0,
				description: 'ID of the person this activity will be associated with',
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
					'ID of the active user whom the activity will be assigned to. If omitted, the activity will be assigned to the authorized user. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			customFieldsCollection,
		],
	},
	{
		displayName: 'Encode Custom Fields',
		name: 'encodeCustomFields',
		type: 'boolean',
		default: false,
		description:
			'Whether to encode custom field values (e.g. convert labels to enum IDs) before sending',
	},
];

const displayOptions = {
	show: {
		resource: ['activity'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

function addAdditionalFields(body: IDataObject, additionalFields: IDataObject): void {
	for (const key of Object.keys(additionalFields)) {
		if (
			key === 'customFields' &&
			(additionalFields.customFields as IDataObject)?.property !== undefined
		) {
			for (const customProperty of (additionalFields.customFields as IDataObject)
				.property as Array<{ name: string; value: string }>) {
				body[customProperty.name] = customProperty.value;
			}
		} else {
			body[key] = additionalFields[key];
		}
	}
}

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const encodeCustom = this.getNodeParameter('encodeCustomFields', 0, false) as boolean;
	let customProperties;
	if (encodeCustom) {
		customProperties = await pipedriveGetCustomProperties.call(this, 'activity');
	}

	for (let i = 0; i < items.length; i++) {
		try {
			const body: IDataObject = {};

			body.subject = this.getNodeParameter('subject', i) as string;
			body.done = coerceToBoolean(this.getNodeParameter('done', i));
			body.type = this.getNodeParameter('type', i) as string;

			const additionalFields = this.getNodeParameter('additionalFields', i);
			addAdditionalFields(body, additionalFields);

			if (customProperties) {
				encodeCustomFieldsV2(customProperties, body);
			}

			const responseData = await pipedriveApiRequest.call(this, 'POST', '/activities', body);

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
