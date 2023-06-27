import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import {
	caseStatusSelector,
	customFieldsCollection,
	severitySelector,
	tlpSelector,
} from '../common.description';
import { prepareCustomFields, theHiveApiRequest } from '../../transport';
import { prepareOptional } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Case ID',
		name: 'id',
		type: 'string',
		default: '',
		required: true,
		description: 'ID of the case',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: true,
	},
	{
		displayName: 'Update Fields',
		type: 'collection',
		name: 'updateFields',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['case'],
				operation: ['update'],
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
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the case',
			},
			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				default: '',
				description: 'Resolution date',
			},
			{
				displayName: 'Flag',
				name: 'flag',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'Flag of the case default=false',
			},
			{
				displayName: 'Impact Status',
				name: 'impactStatus',
				type: 'options',
				default: '',
				options: [
					{
						name: 'No Impact',
						value: 'NoImpact',
					},
					{
						name: 'With Impact',
						value: 'WithImpact',
					},
					{
						name: 'Not Applicable',
						value: 'NotApplicable',
					},
				],
				description: 'Impact status of the case',
			},
			{
				displayName: 'Metrics (JSON)',
				name: 'metrics',
				type: 'json',
				default: '[]',
				displayOptions: {
					show: {
						'/jsonParameters': [true],
					},
				},
				description: 'List of metrics',
			},
			{
				displayName: 'Owner',
				name: 'owner',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Resolution Status',
				name: 'resolutionStatus',
				type: 'options',
				default: '',
				options: [
					{
						value: 'Duplicated',
						name: 'Duplicated',
					},
					{
						value: 'FalsePositive',
						name: 'False Positive',
					},
					{
						value: 'Indeterminate',
						name: 'Indeterminate',
					},
					{
						value: 'Other',
						name: 'Other',
					},
					{
						value: 'TruePositive',
						name: 'True Positive',
					},
				],
				description: 'Resolution status of the case',
			},
			severitySelector,
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				default: '',
				description: 'Date and time of the begin of the case default=now',
			},
			caseStatusSelector,
			{
				displayName: 'Summary',
				name: 'summary',
				type: 'string',
				default: '',
				description: 'Summary of the case, to be provided when closing a case',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the case',
			},
			tlpSelector,
		],
	},
];

const displayOptions = {
	show: {
		resource: ['case'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const id = this.getNodeParameter('id', i) as string;
	const updateFields = this.getNodeParameter('updateFields', i, {});
	const jsonParameters = this.getNodeParameter('jsonParameters', i);

	const customFields = await prepareCustomFields.call(this, updateFields, jsonParameters);

	const body: IDataObject = {
		...customFields,
		...prepareOptional(updateFields),
	};

	responseData = await theHiveApiRequest.call(this, 'PATCH', `/case/${id}`, body);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
