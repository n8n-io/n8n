import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';

import set from 'lodash/set';

import { customFieldsCollection, severitySelector, tlpSelector } from '../common.description';
import { prepareCustomFields, theHiveApiRequest } from '../../transport';
import { prepareOptional, splitTags } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		description: 'Title of the case',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: true,
		default: '',
		description: 'Description of the case',
		typeOptions: {
			rows: 2,
		},
	},
	{ ...severitySelector, required: true },
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'Date and time of the begin of the case default=now',
	},
	{
		displayName: 'Owner',
		name: 'owner',
		type: 'string',
		default: '',
		required: true,
	},
	{
		displayName: 'Flag',
		name: 'flag',
		type: 'boolean',
		required: true,
		default: false,
		// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
		description: 'Flag of the case default=false',
	},
	{ ...tlpSelector, required: true },
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		required: true,
		default: '',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: true,
	},
	{
		displayName: 'Options',
		type: 'collection',
		name: 'options',
		placeholder: 'Add options',
		displayOptions: {
			show: {
				resource: ['case'],
				operation: ['create'],
			},
		},
		default: {},
		options: [
			{
				...customFieldsCollection,
				displayOptions: {
					hide: {
						'/jsonParameters': [true],
					},
				},
			},
			{
				displayName: 'Custom Fields (JSON)',
				name: 'customFieldsJson',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						'/jsonParameters': [true],
					},
				},
				description: 'Custom fields in JSON format. Overrides Custom Fields UI if set.',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				default: '',
				type: 'dateTime',
				description: 'Resolution date',
			},
			{
				displayName: 'Summary',
				name: 'summary',
				type: 'string',
				default: '',
				description: 'Summary of the case, to be provided when closing a case',
			},
			{
				displayName: 'Metrics (JSON)',
				name: 'metrics',
				default: '[]',
				type: 'json',
				displayOptions: {
					show: {
						'/jsonParameters': [true],
					},
				},
				description: 'List of metrics',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['case'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const options = this.getNodeParameter('options', i, {});
	const jsonParameters = this.getNodeParameter('jsonParameters', i);
	const customFields = await prepareCustomFields.call(this, options, jsonParameters);

	const body: IDataObject = {
		title: this.getNodeParameter('title', i),
		description: this.getNodeParameter('description', i),
		severity: this.getNodeParameter('severity', i),
		startDate: Date.parse(this.getNodeParameter('startDate', i) as string),
		owner: this.getNodeParameter('owner', i),
		flag: this.getNodeParameter('flag', i),
		tlp: this.getNodeParameter('tlp', i),
		tags: splitTags(this.getNodeParameter('tags', i) as string),
		...prepareOptional(options),
	};

	if (customFields) {
		Object.keys(customFields).forEach((key) => {
			set(body, key, customFields[key]);
		});
	}

	responseData = await theHiveApiRequest.call(this, 'POST', '/case' as string, body);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
