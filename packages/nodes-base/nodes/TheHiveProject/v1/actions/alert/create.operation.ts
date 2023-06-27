import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';

import set from 'lodash/set';

import {
	alertStatusSelector,
	customFieldsCollection,
	observableDataType,
	severitySelector,
	tlpSelector,
} from '../common.description';
import { prepareCustomFields, theHiveApiRequest } from '../../transport';
import { prepareOptional, splitTags } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'Title of the alert',
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		required: true,
		default: '',
		description: 'Description of the alert',
		typeOptions: {
			rows: 2,
		},
	},
	{ ...severitySelector, required: true },
	{
		displayName: 'Date',
		name: 'date',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'Date and time when the alert was raised default=now',
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'tag,tag2,tag3...',
		description: 'Case Tags',
	},
	{ ...tlpSelector, required: true },
	{
		...alertStatusSelector,
		required: true,
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['alert'],
				operation: ['create'],
			},
		},
		description: 'Type of the alert',
	},
	{
		displayName: 'Source',
		name: 'source',
		type: 'string',
		required: true,
		default: '',
		description: 'Source of the alert',
	},
	{
		displayName: 'SourceRef',
		name: 'sourceRef',
		type: 'string',
		required: true,
		default: '',
		description: 'Source reference of the alert',
	},
	{
		displayName: 'Follow',
		name: 'follow',
		type: 'boolean',
		required: true,
		default: true,
		description: 'Whether the alert becomes active when updated default=true',
	},
	{
		displayName: 'Artifacts',
		name: 'artifactUi',
		type: 'fixedCollection',
		placeholder: 'Add Artifact',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				displayName: 'Artifact',
				name: 'artifactValues',
				values: [
					observableDataType,
					{
						displayName: 'Data',
						name: 'data',
						type: 'string',
						displayOptions: {
							hide: {
								dataType: ['file'],
							},
						},
						default: '',
					},
					{
						displayName: 'Binary Property',
						name: 'binaryProperty',
						type: 'string',
						displayOptions: {
							show: {
								dataType: ['file'],
							},
						},
						default: 'data',
					},
					{
						displayName: 'Message',
						name: 'message',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Case Tags',
						name: 'tags',
						type: 'string',
						default: '',
					},
				],
			},
		],
		description: 'Artifact attributes',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: true,
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		placeholder: 'Add Field',
		type: 'collection',
		default: {},
		options: [
			{
				displayName: 'Case Template',
				name: 'caseTemplate',
				type: 'string',
				default: '',
				description: 'Case template to use when a case is created from this alert',
			},
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
		],
	},
];

const displayOptions = {
	show: {
		resource: ['alert'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const additionalFields = this.getNodeParameter('additionalFields', i);
	const jsonParameters = this.getNodeParameter('jsonParameters', i);

	const customFields = await prepareCustomFields.call(this, additionalFields, jsonParameters);
	const body: IDataObject = {
		title: this.getNodeParameter('title', i),
		description: this.getNodeParameter('description', i),
		severity: this.getNodeParameter('severity', i),
		date: Date.parse(this.getNodeParameter('date', i) as string),
		tags: splitTags(this.getNodeParameter('tags', i) as string),
		tlp: this.getNodeParameter('tlp', i),
		status: this.getNodeParameter('status', i),
		type: this.getNodeParameter('type', i),
		source: this.getNodeParameter('source', i),
		sourceRef: this.getNodeParameter('sourceRef', i),
		follow: this.getNodeParameter('follow', i, true),
		...prepareOptional(additionalFields),
	};

	if (customFields) {
		Object.keys(customFields).forEach((key) => {
			set(body, key, customFields[key]);
		});
	}

	const artifactUi = this.getNodeParameter('artifactUi', i) as IDataObject;

	if (artifactUi) {
		const artifactValues = artifactUi.artifactValues as IDataObject[];

		if (artifactValues) {
			const artifactData = [];

			for (const artifactvalue of artifactValues) {
				const element: IDataObject = {};

				element.message = artifactvalue.message as string;

				element.tags = (artifactvalue.tags as string).split(',');

				element.dataType = artifactvalue.dataType as string;

				element.data = artifactvalue.data as string;

				if (artifactvalue.dataType === 'file') {
					const binaryPropertyName = artifactvalue.binaryProperty as string;
					const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
					element.data = `${binaryData.fileName};${binaryData.mimeType};${binaryData.data}`;
				}

				artifactData.push(element);
			}
			body.artifacts = artifactData;
		}
	}

	responseData = await theHiveApiRequest.call(this, 'POST', '/alert' as string, body);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
