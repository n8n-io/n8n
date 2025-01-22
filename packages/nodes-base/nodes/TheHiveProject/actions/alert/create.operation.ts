import FormData from 'form-data';
import set from 'lodash/set';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { observableTypeOptions } from '../../descriptions';
import { fixFieldType, prepareInputItem, splitAndTrim } from '../../helpers/utils';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Fields',
		name: 'alertFields',
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
		displayName: 'Observables',
		name: 'observableUi',
		type: 'fixedCollection',
		placeholder: 'Add Observable',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					observableTypeOptions,
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
						displayName: 'Input Binary Field',
						name: 'binaryProperty',
						type: 'string',
						hint: 'The name of the input binary field containing the file to be written',
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
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
					},
				],
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

export async function execute(
	this: IExecuteFunctions,
	i: number,
	item: INodeExecutionData,
): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];
	let inputData: IDataObject = {};

	const dataMode = this.getNodeParameter('alertFields.mappingMode', i) as string;

	if (dataMode === 'autoMapInputData') {
		const schema = this.getNodeParameter('alertFields.schema', i) as IDataObject[];
		inputData = prepareInputItem(item.json, schema, i);
	}

	if (dataMode === 'defineBelow') {
		const alertFields = this.getNodeParameter('alertFields.value', i, []) as IDataObject;
		inputData = alertFields;
	}

	inputData = fixFieldType(inputData);

	const body: IDataObject = {};

	for (const field of Object.keys(inputData)) {
		// use set to construct the updateBody, as it allows to process customFields.fieldName
		// if customFields provided under customFields property, it will be send as is
		set(body, field, inputData[field]);
	}

	let multiPartRequest = false;
	const formData = new FormData();

	const observableUi = this.getNodeParameter('observableUi', i) as IDataObject;
	if (observableUi) {
		const values = observableUi.values as IDataObject[];

		if (values) {
			const observables = [];

			for (const value of values) {
				const observable: IDataObject = {};

				observable.dataType = value.dataType as string;
				observable.message = value.message as string;
				observable.tags = splitAndTrim(value.tags as string);

				if (value.dataType === 'file') {
					multiPartRequest = true;

					const attachmentIndex = `attachment${i}`;
					observable.attachment = attachmentIndex;

					const binaryPropertyName = value.binaryProperty as string;
					const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
					const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

					formData.append(attachmentIndex, dataBuffer, {
						filename: binaryData.fileName,
						contentType: binaryData.mimeType,
					});
				} else {
					observable.data = value.data as string;
				}

				observables.push(observable);
			}
			body.observables = observables;
		}
	}

	if (multiPartRequest) {
		formData.append('_json', JSON.stringify(body));
		responseData = await theHiveApiRequest.call(
			this,
			'POST',
			'/v1/alert',
			undefined,
			undefined,
			undefined,
			{
				Headers: {
					'Content-Type': 'multipart/form-data',
				},
				formData,
			},
		);
	} else {
		responseData = await theHiveApiRequest.call(this, 'POST', '/v1/alert' as string, body);
	}

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
