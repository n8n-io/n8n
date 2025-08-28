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

export class Mindee implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mindee',
		name: 'mindee',
		icon: 'file:mindee.svg',
		group: ['input'],
		version: [1, 2, 3, 4],
		subtitle: '={{$parameter["modelId"]}}',
		description: 'Consume Mindee API',
		defaults: {
			name: 'Mindee',
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
				displayName: 'Input Binary Field',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				hint: 'The name of the input binary field containing the file to be uploaded',
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
				description: 'Whether to retrieve location data associated with each result',
			},
			{
				displayName: 'Enable Confidence Scores',
				name: 'confidence',
				type: 'boolean',
				default: false,
				description: 'Whether to retrieve confidence scores associated with each result',
			},
			{
				displayName: 'Enable Raw Text',
				name: 'rawText',
				type: 'boolean',
				default: false,
				description: 'Whether to retrieve the raw OCR/text readings from the file',
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
				const modelId = this.getNodeParameter('modelId', i);
				const alias = this.getNodeParameter('alias', i);
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
				const rag = this.getNodeParameter('rag', i) as boolean;
				const polygons = this.getNodeParameter('polygon', i) as boolean;
				const confidence = this.getNodeParameter('confidence', i) as boolean;
				const rawText = this.getNodeParameter('rawText', i) as boolean;
				const maxDelayCount = this.getNodeParameter('maxDelayCount', i) as number;

				const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
				const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

				const form = new FormData();
				form.append('file', dataBuffer, { filename: binaryData.fileName });
				form.append('model_id', modelId as string);
				form.append('alias', alias as string);
				form.append('rag', rag ? 'true' : 'false');
				form.append('polygons', polygons ? 'true' : 'false');
				form.append('confidence', confidence ? 'true' : 'false');
				form.append('raw_text', rawText ? 'true' : 'false');
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
