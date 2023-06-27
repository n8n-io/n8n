import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import {
	alertStatusSelector,
	customFieldsCollection,
	observableDataType,
	severitySelector,
	tlpSelector,
} from '../common.description';
import { prepareCustomFields, theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Alert ID',
		name: 'id',
		type: 'string',
		required: true,
		default: '',
		description: 'Title of the alert',
	},
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		default: true,
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['alert'],
				operation: ['update'],
			},
		},
		options: [
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
				displayOptions: {
					show: {
						'/jsonParameters': [true],
					},
				},
				default: '',
				description: 'Custom fields in JSON format. Overrides Custom Fields UI if set.',
			},
			{
				displayName: 'Case Template',
				name: 'caseTemplate',
				type: 'string',
				default: '',
				description: 'Case template to use when a case is created from this alert',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'Description of the alert',
			},
			{
				displayName: 'Follow',
				name: 'follow',
				type: 'boolean',
				default: true,
				description: 'Whether the alert becomes active when updated default=true',
			},
			severitySelector,
			alertStatusSelector,
			{
				displayName: 'Case Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'tag,tag2,tag3...',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				description: 'Title of the alert',
			},
			tlpSelector,
		],
	},
];

const displayOptions = {
	show: {
		resource: ['alert'],
		operation: ['update'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const alertId = this.getNodeParameter('id', i) as string;
	const jsonParameters = this.getNodeParameter('jsonParameters', i);

	const updateFields = this.getNodeParameter('updateFields', i);
	const customFields = await prepareCustomFields.call(this, updateFields, jsonParameters);

	const artifactUi = updateFields.artifactUi as IDataObject;

	delete updateFields.artifactUi;

	const body: IDataObject = {
		...customFields,
	};

	Object.assign(body, updateFields);

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

	responseData = await theHiveApiRequest.call(this, 'PATCH', `/alert/${alertId}`, body);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
