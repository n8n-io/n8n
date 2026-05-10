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
	coerceToBoolean,
	toRfc3339,
	addFieldsToBody,
} from '../../helpers';
import { customFieldsCollection, rawCustomFieldKeysOption } from '../common.description';

const properties: INodeProperties[] = [
	{
		displayName: 'Activity ID',
		name: 'activityId',
		type: 'number',
		default: 0,
		required: true,
		description: 'ID of the activity to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Busy Flag',
				name: 'busy_flag',
				type: 'boolean',
				default: false,
				description: 'Whether the user is set to busy during the activity',
			},
			{
				displayName: 'Deal ID',
				name: 'deal_id',
				type: 'number',
				default: 0,
				description: 'ID of the deal this activity will be associated with',
			},
			{
				displayName: 'Done',
				name: 'done',
				type: 'boolean',
				default: false,
				description: 'Whether the activity is done or not',
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
				displayName: 'Public Description',
				name: 'public_description',
				type: 'string',
				default: '',
				description:
					'Additional details about the activity that is synced to your external calendar',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'The subject of the activity',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'string',
				default: '',
				placeholder: 'call',
				description: 'Type of the activity like "call", "meeting", etc',
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
	rawCustomFieldKeysOption,
];

const displayOptions = {
	show: {
		resource: ['activity'],
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
		customProperties = await pipedriveGetCustomProperties.call(this, 'activity');
	}

	for (let i = 0; i < items.length; i++) {
		try {
			const activityId = this.getNodeParameter('activityId', i) as number;
			const body: IDataObject = {};

			const updateFields = this.getNodeParameter('updateFields', i);
			addFieldsToBody(body, updateFields);

			// Coerce done to boolean for v2 API
			if (body.done !== undefined) {
				body.done = coerceToBoolean(body.done);
			}

			if (body.due_date) {
				body.due_date = toRfc3339(body.due_date as string);
			}

			if (customProperties) {
				encodeCustomFieldsV2(customProperties, body);
			}

			const responseData = await pipedriveApiRequest.call(
				this,
				'PATCH',
				`/activities/${activityId}`,
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
