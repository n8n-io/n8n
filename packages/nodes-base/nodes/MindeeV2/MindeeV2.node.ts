import FormData from 'form-data';
import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionTypes,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	buildRequestBody,
	extractPollingUrl,
	mindeeApiRequest,
	pollMindee,
	readUIParams,
} from './GenericFunctions';
import { getModels } from './SearchFunctions';

const ROOT_URL = 'https://api-v2.mindee.net/v2';
const API_URL = `${ROOT_URL}/inferences/enqueue`;

export class MindeeV2 implements INodeType {
	methods = {
		listSearch: {
			getModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'Mindee V2',
		name: 'mindeeV2',
		icon: 'file:mindee.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
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
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				default: 'document',
				options: [{ name: 'Document', value: 'document' }],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['document'] } },
				options: [
					{
						name: 'Document Data Extraction',
						value: 'fileEnqueueAndPoll',
						description:
							'Extract data from a document file and return the result.' +
							" Use any of the models you've built on Mindee.",
						action: 'Extract Document Data',
					},
				],
				default: 'fileEnqueueAndPoll',
			},
			{
				displayName: 'Binary Property Name',
				name: 'binaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				description: 'The name of the input binary field containing the file to be uploaded',
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['fileEnqueueAndPoll'],
					},
				},
			},
			{
				displayName: 'Model ID',
				name: 'modelId',
				type: 'resourceLocator',
				description: 'Select a model or enter an ID',
				required: true,
				default: {
					mode: 'list',
					value: '',
					cachedResultName: '',
				},
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['fileEnqueueAndPoll'],
					},
				},
				modes: [
					{
						displayName: 'List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a model ID...',
						typeOptions: {
							searchListMethod: 'getModels',
							searchable: true,
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						placeholder: 'Model ID…',
					},
				],
			},
			{
				displayName: 'Polling Timeout (Seconds)',
				name: 'pollingTimeoutCount',
				type: 'number',
				typeOptions: {
					minValue: 5,
					numberStepSize: 1,
				},
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['fileEnqueueAndPoll'],
					},
				},
				default: 180,
				description:
					'How long the polling will last for after the document has been sent to the server',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['document'],
						operation: ['fileEnqueueAndPoll'],
					},
				},
				options: [
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
								value: 'true',
							},
							{
								name: 'Disabled',
								value: 'false',
							},
						],
						default: 'default',
						description:
							'Extract the full text content from the document as strings, and fill the `raw_text` attribute',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		for (let i = 0; i < items.length; i++) {
			try {
				let result: IDataObject[] | undefined = undefined;
				const resource = this.getNodeParameter('resource', i);

				if (resource === 'document') {
					const params = readUIParams(this, i);
					const form = new FormData();
					await buildRequestBody(this, i, params, form);
					const headers = {
						...form.getHeaders?.(),
						'User-Agent': `mindee-n8n@v${this.getNode().typeVersion ?? 'unknown'}`,
					} as IDataObject;
					const enqueue = await mindeeApiRequest.call(this, 'POST', API_URL, form, {}, headers);
					const pollingUrl = extractPollingUrl(this, enqueue);
					result = await pollMindee(this, pollingUrl, params.pollingTimeoutCount);
				}
				if (!result) {
					throw new NodeOperationError(this.getNode(), 'Unknown operation', {
						description: 'No operation matched the provided operation',
					});
				}

				returnData.push.apply(returnData, Array.isArray(result) ? result : [result]);
			} catch (error) {
				if (this.continueOnFail()) {
					const errorMessage =
						error instanceof NodeApiError || error instanceof NodeOperationError
							? error.message
							: String(error);
					returnData.push({ error: errorMessage });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
