import FormData from 'form-data';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { mindeeApiRequest, pollMindee } from './GenericFunctions';

export class MindeeV2 implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mindee V2',
		name: 'mindeeV2',
		icon: 'file:mindee.svg',
		group: ['input'],
		version: [1],
		subtitle: '={{$parameter["modelId"]}}',
		description: 'Consume Mindee API V2',
		defaults: {
			name: 'Mindee V2',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'mindeeV2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				options: [
					{
						name: 'Binary Data',
						value: 'binary',
						description: 'Upload file from binary data',
					},
					{
						name: 'URL',
						value: 'url',
						description: 'Download file from URL',
					},
				],
				default: 'binary',
				description: 'Choose whether to upload from binary data or download from URL',
			},
			{
				displayName: 'Binary Property Name',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				hint: 'The name of the input binary field containing the file to be uploaded',
				displayOptions: {
					show: {
						inputType: ['binary'],
					},
				},
			},
			{
				displayName: 'File URL',
				name: 'fileUrl',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://example.com/document.pdf',
				description: 'URL pointing to the file to be processed',
				displayOptions: {
					show: {
						inputType: ['url'],
					},
				},
			},
			{
				displayName: 'Model ID',
				name: 'modelId',
				type: 'string',
				default: '',
				description: 'ID of the model to poll',
			},
			{
				displayName: 'File Alias (Optional)',
				name: 'alias',
				type: 'string',
				default: '',
				description: 'Optional alias for the file',
			},
			{
				displayName: 'Enable RAG',
				name: 'rag',
				type: 'boolean',
				default: false,
				description: 'Whether to enable Retrieval-Augmented Generation for compatible plans',
			},
			{
				displayName: 'Enable Polygons (Location Data)',
				name: 'polygon',
				type: 'boolean',
				default: false,
				description:
					'Whether to retrieve location data associated with each result for compatible plans',
			},
			{
				displayName: 'Enable Confidence Scores',
				name: 'confidence',
				type: 'boolean',
				default: false,
				description:
					'Whether to retrieve confidence scores associated with each result for compatible plans',
			},
			{
				displayName: 'Enable Raw Text',
				name: 'rawText',
				type: 'boolean',
				default: false,
				description:
					'Whether to retrieve the raw OCR/text readings from the file for compatible plans',
			},
			{
				displayName: 'Polling Timeout (Seconds)',
				name: 'maxDelayCount',
				type: 'number',
				typeOptions: {
					minValue: 5,
					numberStepSize: 1,
				},
				default: 120,
				description:
					'How long the polling will last for after the document has been sent tot he server',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		const url = 'https://api-v2.mindee.net/v2/inferences/enqueue';
		let enqueueResponseData, responseData;
		for (let i = 0; i < length; i++) {
			try {
				const form = new FormData();
				const modelId = this.getNodeParameter('modelId', i);
				const alias = this.getNodeParameter('alias', i);
				const inputType = this.getNodeParameter('inputType', i);
				const rag = this.getNodeParameter('rag', i) as boolean;
				const polygon = this.getNodeParameter('polygon', i) as boolean;
				const confidence = this.getNodeParameter('confidence', i) as boolean;
				const rawText = this.getNodeParameter('rawText', i) as boolean;
				const maxDelayCount = this.getNodeParameter('maxDelayCount', i) as number;
				if (inputType === 'binary') {
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
					const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
					const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
					form.append('file', dataBuffer, { filename: binaryData.fileName });
				} else if (inputType === 'url') {
					const fileUrl = this.getNodeParameter('fileUrl', i);
					form.append('url', fileUrl as string);
				}

				form.append('model_id', modelId as string);
				form.append('alias', alias as string);
				form.append('rag', rag ? 'true' : 'false');
				form.append('polygon', polygon ? 'true' : 'false');
				form.append('confidence', confidence ? 'true' : 'false');
				form.append('raw_text', rawText ? 'true' : 'false');

				enqueueResponseData = await mindeeApiRequest.call(this, 'POST', url, form);

				responseData = await pollMindee(this, enqueueResponseData as IDataObject, maxDelayCount);
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData);
				} else if (responseData !== undefined) {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as IDataObject).message as string });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
