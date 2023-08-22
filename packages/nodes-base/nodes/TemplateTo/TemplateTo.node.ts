import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { templateToApiRequest } from './GenericFunctions';

export class TemplateTo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'TemplateTo',
		name: 'TemplateTo',
		icon: 'file:logo.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Powerful Template Based Document Generation',
		defaults: {
			name: 'Template',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'templateToApi',
				required: false,
			},
		],
		requestDefaults: {
			baseURL: 'https://api.templateto.com',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Template',
						value: 'templates',
					},
					{
						name: 'Pdf Renderer',
						value: 'pdf-render',
					},
					{
						name: 'Txt Renderer',
						value: 'txt-render',
					},
				],
				default: 'templates',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['templates'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get a template',
						displayOptions: {
							show: {
								resource: ['templates'],
							},
						},
					},
					{
						name: 'Get All Template Names',
						value: 'getAllSlim',
						action: 'Get all template names',
						displayOptions: {
							show: {
								resource: ['templates'],
							},
						},
					},
					{
						name: 'Get Paged',
						value: 'getPaged',
						action: 'Get all templates by page number and size',
						displayOptions: {
							show: {
								resource: ['templates'],
							},
						},
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['pdf-render'],
					},
				},
				options: [
					{
						name: 'Render as PDF Byte Array',
						value: 'render-as-pdf-byte-array',
						action: 'Render template as pdf byte array',
						displayOptions: {
							show: {
								resource: ['pdf-render'],
							},
						},
					},
					{
						name: 'Render as PDF',
						value: 'render-as-pdf',
						action: 'Render template as pdf',
						displayOptions: {
							show: {
								resource: ['pdf-render'],
							},
						},
					},
				],
				default: 'render-as-pdf-byte-array',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['txt-render'],
					},
				},
				options: [
					{
						name: 'Render as TXT Byte Array',
						value: 'render-as-txt-byte-array',
						action: 'Render template as txt byte array',
						displayOptions: {
							show: {
								resource: ['txt-render'],
							},
						},
					},
					{
						name: 'Render as TXT',
						value: 'render-as-txt',
						action: 'Render template as txt',
						displayOptions: {
							show: {
								resource: ['txt-render'],
							},
						},
					},
				],
				default: 'render-as-txt-byte-array',
			},
			{
				displayName: 'Template ID',
				description: 'ID of the template',
				required: true,
				name: 'templateId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['templates', 'pdf-render', 'txt-render'],
						operation: [
							'get',
							'render-as-pdf-byte-array',
							'render-as-txt-byte-array',
							'render-as-pdf',
							'render-as-txt',
						],
					},
				},
			},
			{
				displayName: 'Page Number',
				description: 'Number of the page number to get',
				required: true,
				name: 'pageNumber',
				type: 'number',
				default: '',
				displayOptions: {
					show: {
						resource: ['templates'],
						operation: ['getPaged'],
					},
				},
			},
			{
				displayName: 'Page Size',
				description: 'How many record to retrieve on the page',
				required: true,
				name: 'pageSize',
				type: 'number',
				default: '',
				displayOptions: {
					show: {
						resource: ['templates'],
						operation: ['getPaged'],
					},
				},
			},
			{
				displayName: 'Footer Template ID',
				description: 'Template ID to use for the footer',
				name: 'footerId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['pdf-render', 'txt-render'],
						operation: [
							'render-as-pdf-byte-array',
							'render-as-txt-byte-array',
							'render-as-pdf',
							'render-as-txt',
						],
					},
				},
			},
			{
				displayName: 'Header Template ID',
				description: 'Template ID to use for the header',
				name: 'headerId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['pdf-render', 'txt-render'],
						operation: [
							'render-as-pdf-byte-array',
							'render-as-txt-byte-array',
							'render-as-pdf',
							'render-as-txt',
						],
					},
				},
			},
		],
	};

	constructor() {}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		let responseData;

		const items = this.getInputData();

		const returnData: IDataObject[] = [];

		const length = items.length;

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			if (resource === 'templates') {
				switch (operation) {
					case 'get':
						const templateId = this.getNodeParameter('templateId', i) as string;

						responseData = await templateToApiRequest.call(
							this,
							'GET',
							`/template/get/${templateId}`,
						);
						break;
					case 'getAllSlim':
						responseData = await templateToApiRequest.call(this, 'GET', `/template/getall/slim`);
						break;
					case 'getPaged':
						const pageNumber = this.getNodeParameter('pageNumber', i) as string;
						const pageSize = this.getNodeParameter('pageSize', i) as string;

						responseData = await templateToApiRequest.call(
							this,
							'GET',
							`/template/getpaged/${pageNumber}/${pageSize}`,
						);
						break;
				}
			} else if (resource === 'pdf-render' || resource === 'txt-render') {
				let templateId;
				let footerId;
				let headerId;

				const pdfTxtEndpoint = operation.indexOf('pdf') !== -1 ? 'pdf' : 'txt';

				switch (operation) {
					case 'render-as-pdf-byte-array':
					case 'render-as-txt-byte-array':
						templateId = this.getNodeParameter('templateId', i) as string;
						footerId = this.getNodeParameter('footerId', i) as string;
						headerId = this.getNodeParameter('templateId', i) as string;

						responseData = await templateToApiRequest.call(
							this,
							'POST',
							`/render/${pdfTxtEndpoint}/${templateId}/as-byte-array`,
							{ footerId, headerId },
						);
						break;
					case 'render-as-pdf':
					case 'render-as-txt':
						templateId = this.getNodeParameter('templateId', i) as string;
						footerId = this.getNodeParameter('footerId', i) as string;
						headerId = this.getNodeParameter('templateId', i) as string;

						responseData = await templateToApiRequest.call(
							this,
							'POST',
							`/render/${pdfTxtEndpoint}/${templateId}`,
							{ footerId, headerId },
						);
						break;
				}
			}
		}

		if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} else {
			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
