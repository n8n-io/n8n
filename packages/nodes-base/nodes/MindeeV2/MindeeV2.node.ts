import FormData from 'form-data';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { buildRequestBody, mindeeApiRequest, pollMindee, readUIParams } from './GenericFunctions';

const API_URL = 'https://api-v2.mindee.net/v2/inferences/enqueue';

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
				displayName: 'Binary Property Name',
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
				type: 'options',
				options: [
					{
						name: 'Use Model Default',
						value: 'default',
					},
					{
						name: 'Enabled',
						value: 'true',
					},
					{
						name: 'Disabled',
						value: 'false',
					},
				],
				default: 'default',
				description: 'Enhance extraction accuracy with Retrieval-Augmented Generation',
			},
			{
				displayName: 'Enable Polygons (Location Data)',
				name: 'polygon',
				type: 'options',
				options: [
					{
						name: 'Use Model Default',
						value: 'default',
					},
					{
						name: 'Enabled',
						value: 'true',
					},
					{
						name: 'Disabled',
						value: 'false',
					},
				],
				default: 'default',
				description:
					'Calculate bounding box polygons for all fields, and fill their `locations` attribute',
			},
			{
				displayName: 'Enable Confidence Scores',
				name: 'confidence',
				type: 'options',
				options: [
					{
						name: 'Use Model Default',
						value: 'default',
					},
					{
						name: 'Enabled',
						value: 'true',
					},
					{
						name: 'Disabled',
						value: 'false',
					},
				],
				default: 'default',
				description:
					'Calculate confidence scores for all fields, and fill their `confidence` attribute',
			},
			{
				displayName: 'Enable Raw Text',
				name: 'rawText',
				type: 'options',
				options: [
					{
						name: 'Use Model Default',
						value: 'default',
					},
					{
						name: 'Enabled',
						value: true,
					},
					{
						name: 'Disabled',
						value: false,
					},
				],
				default: 'default',
				description:
					'Extract the full text content from the document as strings, and fill the `raw_text` attribute',
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
		for (let i = 0; i < items.length; i++) {
			try {
				const params = readUIParams(this, i);
				const form = new FormData();
				await buildRequestBody(this, i, params, form);

				const enqueue = await mindeeApiRequest.call(this, 'POST', API_URL, form);
				const result = await pollMindee(this, enqueue, params.maxDelayCount);

				returnData.push(...(Array.isArray(result) ? result : [result]));
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as Error).message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
