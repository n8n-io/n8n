import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { customFieldsCollection2, observableDataType } from '../common.description';
import { theHiveApiRequest } from '../../transport';
import { convertCustomFieldUiToObject, splitTags } from '../../helpers/utils';

const properties: INodeProperties[] = [
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'resourceMapper',
		default: {
			mappingMode: 'defineBelow',
			value: null,
		},
		noDataExpression: true,
		required: true,
		typeOptions: {
			resourceMapper: {
				resourceMapperMethod: 'getAlertFields',
				mode: 'add',
				valuesLabel: 'Fields',
			},
		},
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
	customFieldsCollection2,
];

const displayOptions = {
	show: {
		resource: ['alert'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	i: number,
	item: INodeExecutionData,
): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];
	let body: IDataObject = {};

	const dataMode = this.getNodeParameter('fields.mappingMode', i) as string;

	if (dataMode === 'autoMapInputData') {
		body = item.json;
	}

	if (dataMode === 'defineBelow') {
		const fields = this.getNodeParameter('fields.value', i, []) as IDataObject;
		body = fields;
	}

	if (body.tags) {
		body.tags = splitTags(body.tags);
	}

	const customFieldsUi = this.getNodeParameter('customFieldsUi.values', i, {}) as IDataObject;
	body.customFields = convertCustomFieldUiToObject(customFieldsUi);

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

	responseData = await theHiveApiRequest.call(this, 'POST', '/v1/alert' as string, body);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
