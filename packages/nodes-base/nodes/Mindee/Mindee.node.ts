import FormData from 'form-data';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';
import { setTimeout } from 'node:timers/promises';

import { mindeeApiRequest } from './GenericFunctions';
import type { JsonObject } from '../ActionNetwork/types';

const INITIAL_DELAY_MS = 1500;
const POLL_DELAY_MS = 1000;

export async function pollMindee(
	funcRef: IExecuteFunctions,
	initialResponse: IDataObject,
	maxDelayCounter: number,
): Promise<IDataObject[]> {
	const result: IDataObject[] = [];
	let serverResponse = initialResponse;
	const jobId: string | undefined = (serverResponse?.job as IDataObject)?.id as string;
	if (!jobId || jobId.length === 0) {
		throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject, {
			message: 'Mindee POST response does not contain a job id.',
		});
	}
	let jobStatus: string = (serverResponse.job as IDataObject).status as string;
	const pollEndpoint = `/jobs/${jobId}`;
	const inferencesEndpoint = `/inferences/${jobId}`;

	await setTimeout(INITIAL_DELAY_MS);

	for (let i = 0; i < maxDelayCounter; i++) {
		if (
			serverResponse.error ||
			(serverResponse?.job as IDataObject).error ||
			jobStatus === 'Failed'
		) {
			throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject);
		}

		if (jobStatus === 'Processed') break;

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		serverResponse = await mindeeApiRequest.call(funcRef, 'GET', pollEndpoint);

		if (serverResponse.error || !('job' in serverResponse))
			throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject, {
				message: 'Mindee API responded with an error.',
			});
		jobStatus = (serverResponse.job as IDataObject).status as string;
		await setTimeout(POLL_DELAY_MS);
	}

	if (jobStatus !== 'Processed')
		throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject, {
			message: 'Server polling timed out.',
		});

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	serverResponse = await mindeeApiRequest.call(funcRef, 'GET', inferencesEndpoint);
	if ((serverResponse?.job as IDataObject)?.error)
		throw new NodeApiError(funcRef.getNode(), serverResponse as JsonObject, {
			message: JSON.stringify(serverResponse as JsonObject),
		});
	result.push(serverResponse);
	return result;
}

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
				name: 'polygons',
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
		let enqueueResponseData, responseData;
		let endpointEnqueue;
		for (let i = 0; i < length; i++) {
			try {
				const modelId = this.getNodeParameter('modelId', i);
				const alias = this.getNodeParameter('alias', i);
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i);
				const rag = this.getNodeParameter('rag', i) as boolean;
				const polygons = this.getNodeParameter('polygons', i) as boolean;
				const confidence = this.getNodeParameter('confidence', i) as boolean;
				const rawText = this.getNodeParameter('rawText', i) as boolean;
				const maxDelayCount = this.getNodeParameter('maxDelayCount', i) as number;

				const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
				const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

				endpointEnqueue = '/inferences/enqueue';
				const form = new FormData();
				form.append('file', dataBuffer, { filename: binaryData.fileName });
				form.append('model_id', modelId as string);
				form.append('alias', alias as string);
				form.append('rag', rag ? 'true' : 'false');
				form.append('polygons', polygons ? 'true' : 'false');
				form.append('confidence', confidence ? 'true' : 'false');
				form.append('raw_text', rawText ? 'true' : 'false');
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				enqueueResponseData = await mindeeApiRequest.call(this, 'POST', endpointEnqueue, form);

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
