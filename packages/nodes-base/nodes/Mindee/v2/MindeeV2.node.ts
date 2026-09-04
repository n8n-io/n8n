import FormData from 'form-data';
import {
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
	NodeApiError,
	NodeConnectionTypes,
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
					operation: ['extraction', 'classification', 'crop', 'ocr', 'split'],
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
					operation: ['extraction', 'classification', 'crop', 'ocr', 'split'],
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
					operation: ['extraction', 'classification', 'crop', 'ocr', 'split'],
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
					operation: ['extraction', 'classification', 'crop', 'ocr', 'split'],
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
					operation: ['extraction', 'classification', 'crop', 'ocr', 'split'],
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
					displayOptions: {
						show: {
							// eslint-disable-next-line @typescript-eslint/naming-convention
							'/operation': ['extraction'],
						},
					},
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
					displayOptions: {
						show: {
							// eslint-disable-next-line @typescript-eslint/naming-convention
							'/operation': ['extraction'],
						},
					},
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
					displayOptions: {
						show: {
							// eslint-disable-next-line @typescript-eslint/naming-convention
							'/operation': ['extraction'],
						},
					},
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
					displayOptions: {
						show: {
							// eslint-disable-next-line @typescript-eslint/naming-convention
							'/operation': ['extraction'],
						},
					},
					description:
						'Extract the full text content from the document as strings, and fill the `raw_text` attribute',
				},
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
		const returnData: IDataObject[] = [];
		for (let i = 0; i < items.length; i++) {
			let result: IDataObject[] | undefined;
			try {
				const operation = this.getNodeParameter('operation', i);
				const slug = operation;

				if (['extraction', 'classification', 'crop', 'ocr', 'split'].includes(slug)) {
					const params = readUIParams(this, i);
					const form = new FormData();
					await buildRequestBody(this, i, params, form);
					const headers = form.getHeaders();
					const enqueue = await mindeeApiRequest.call(
						this,
						'POST',
						`${ROOT_URL}/products/${slug}/enqueue`,
						form,
						{},
						headers,
					);
					const pollingUrl = extractPollingUrl(this, enqueue);
					result = await pollMindee(this, pollingUrl, params.pollingTimeoutCount);
				}
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

			if (!result) {
				const error = new NodeOperationError(this.getNode(), 'Unknown operation', {
					description: 'No operation matched the provided operation',
				});
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}

			returnData.push.apply(returnData, Array.isArray(result) ? result : [result]);
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
