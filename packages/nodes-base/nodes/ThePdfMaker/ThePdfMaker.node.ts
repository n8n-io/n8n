import type { INodeType, INodeTypeDescription, ILoadOptionsFunctions } from 'n8n-workflow';

export class ThePdfMaker implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'The PDF Maker Generate PDF',
		name: 'thePdfMaker',
		icon: 'file:thepdfmaker.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["templateActions"] + ": " + $parameter["resource"]}}',
		description: 'Generate PDF from data source',
		defaults: {
			name: 'The PDF Maker Generate PDF',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'thePDFMakerApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://backend.thepdfmaker.com/',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'x-api-key': '={{$credentials.apiKey}}',
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
						value: 'template',
					},
				],
				default: 'template',
			},
			{
				displayName: 'Template Name or ID',
				name: 'templateId',
				type: 'options',
				description:
					'Choose a template to generate a PDF. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				required: true,
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['template'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getTemplates',
				},
				routing: {
					request: {
						method: 'POST',
						url: '=/api/n8n/generate-pdf',
						body: {
							templateId: '={{$value}}',
							data: '={{$json}}',
						},
					},
				},
				default: '',
			},
		],
	};

	methods = {
		loadOptions: {
			async getTemplates(this: ILoadOptionsFunctions) {
				const response = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'thePDFMakerApi',
					{
						url: 'https://backend.thepdfmaker.com/api/n8n/get-template-options',
						method: 'GET',
					},
				);

				const templates = Array.isArray(response) ? response : response.data;

				return templates.map((template: { value: string; name: string }) => ({
					name: template?.name,
					value: template?.value,
				}));
				// return [
				// 	{ name: 'test', value: 'test' },
				// 	{ name: 'test2', value: 'test2' },
				// ];
			},
		},
	};
}
