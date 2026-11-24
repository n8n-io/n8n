import FormData from 'form-data';
import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	NodeConnectionTypes,
	NodeOperationError,
	requestUrl,
} from 'n8n-workflow';

import {
	buildRequestBody,
	extractPollingUrl,
	isMindeeOperation,
	mindeeApiRequest,
	OPERATIONS,
	pollMindee,
	readUIParams,
	ROOT_URL,
} from './GenericFunctions';
import { getModels } from './SearchFunctions';

function toggleOption(displayName: string, name: string, description: string): INodeProperties {
	return {
		displayName,
		name,
		type: 'options',
		options: [
			{ name: 'Use Model Default', value: 'default' },
			{ name: 'Enabled', value: 'true' },
			{ name: 'Disabled', value: 'false' },
		],
		default: 'default',
		displayOptions: { show: { '/operation': ['extraction'] } },
		description,
	};
}

const versionDescription: INodeTypeDescription = {
	displayName: 'Mindee',
	name: 'mindee',
	icon: 'file:mindee.svg',
	group: ['input'],
	version: 4,
	subtitle: '={{$parameter["operation"]}}',
	description: 'Consume Mindee API V2',
	defaults: {
		name: 'Mindee',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'mindeeApi',
			required: true,
		},
	],
	properties: [
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Data Extraction',
					value: 'extraction',
					description:
						'Extract data from a document file and return the result ' +
						"using any extraction model you've built on the Mindee platform. " +
						"Select this action if you aren't sure which one to use.",
					action: 'Document Data Extraction',
				},
				{
					name: 'Document Classification',
					value: 'classification',
					description: 'Classify documents using your Mindee classification utility model',
					action: 'Document Classification',
				},
				{
					name: 'Document Crop Operation',
					value: 'crop',
					description:
						'Crop pages in a document using your Mindee Crop model. Can be chained with an Extraction model.',
					action: 'Document Crop Operation',
				},
				{
					name: 'Document Raw Text Reading (OCR)',
					value: 'ocr',
					description: 'Extract raw document text using your Mindee OCR model',
					action: 'Document Raw Text Reading (OCR)',
				},
				{
					name: 'Document Split Operation',
					value: 'split',
					description:
						'Split document pages using your Mindee split model. Can be chained with an Extraction model.',
					action: 'Document Split Operation',
				},
			],
			default: 'extraction',
		},
		{
			displayName: 'Document Source',
			name: 'documentSource',
			type: 'options',
			options: [
				{
					name: 'Binary File',
					value: 'binary',
					description:
						'Send a file coming from a previous node (e.g. HTTP Request, Read Binary File)',
				},
				{
					name: 'URL',
					value: 'url',
					description: 'Have Mindee fetch the document from a public URL',
				},
			],
			default: 'binary',
			description: 'How the document to process is provided',
			displayOptions: {
				show: {
					operation: [...OPERATIONS],
				},
			},
		},
		{
			displayName: 'Input Data Field Name',
			name: 'binaryPropertyName',
			type: 'string',
			required: true,
			default: 'data',
			description:
				'The name of the incoming binary field that contains the document file (e.g. <code>data</code>)',
			displayOptions: {
				show: {
					operation: [...OPERATIONS],
					documentSource: ['binary'],
				},
			},
		},
		{
			displayName: 'Document URL',
			name: 'documentUrl',
			type: 'string',
			required: true,
			default: '',
			placeholder: 'https://example.com/invoice.pdf',
			description: 'Public URL of the document to process',
			displayOptions: {
				show: {
					operation: [...OPERATIONS],
					documentSource: ['url'],
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
					operation: [...OPERATIONS],
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
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			placeholder: 'Add option',
			default: {},
			displayOptions: {
				show: {
					operation: [...OPERATIONS],
				},
			},
			options: [
				toggleOption(
					'Enable Confidence Scores',
					'confidence',
					'Calculate confidence scores for all fields, and fill their `confidence` attribute',
				),
				toggleOption(
					'Enable Polygons (Location Data)',
					'polygon',
					'Calculate bounding box polygons for all fields, and fill their `locations` attribute',
				),
				toggleOption(
					'Enable RAG',
					'rag',
					'Enhance extraction accuracy with Retrieval-Augmented Generation',
				),
				toggleOption(
					'Enable Raw Text',
					'rawText',
					'Extract the full text content from the document as strings, and fill the `raw_text` attribute',
				),
				{
					displayName: 'Polling Timeout (Seconds)',
					name: 'pollingTimeoutCount',
					type: 'number',
					typeOptions: {
						minValue: 5,
						numberStepSize: 1,
					},
					default: 180,
					description:
						'How long the polling will last for after the document has been sent to the server',
				},
			],
		},
	],
};

export class MindeeV2 implements INodeType {
	description: INodeTypeDescription;

	methods = {
		listSearch: {
			getModels,
		},
	};

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i);
				if (!isMindeeOperation(operation)) {
					throw new NodeOperationError(this.getNode(), `Unknown operation: ${String(operation)}`, {
						itemIndex: i,
					});
				}
				const params = readUIParams(this, i);
				const form = new FormData();
				await buildRequestBody(this, i, params, form);
				const enqueue = await mindeeApiRequest.call(
					this,
					'POST',
					requestUrl`${ROOT_URL}/products/${operation}/enqueue`,
					form,
					{},
					form.getHeaders(),
				);
				const pollingUrl = extractPollingUrl(this, enqueue);
				const result = await pollMindee(this, pollingUrl, params.pollingTimeoutCount);
				returnData.push(
					...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(result), {
						itemData: { item: i },
					}),
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error instanceof Error ? error.message : String(error) },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}
		return [returnData];
	}
}
