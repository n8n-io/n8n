import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	NodeExecutionWithMetadata,
} from 'n8n-workflow';
import { ApplicationError, jsonParse } from 'n8n-workflow';

export class Ragic implements INodeType {
	description: INodeTypeDescription = {
		// Basic node details will go here
		displayName: 'Ragic',
		name: 'ragic',
		icon: 'file:Ragic.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["action"]}}',
		description: 'Ragic: #1 No Code database builder',
		defaults: {
			name: 'Ragic',
		},
		inputs: ['main'] as NodeConnectionType[],
		outputs: ['main'] as NodeConnectionType[],
		credentials: [
			{
				name: 'ragicApi',
				required: true,
			},
		],
		properties: [
			// Resources and operations will go here
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create New Data',
						value: 'createNewData',
					},
					{
						name: 'Update Existed Data',
						value: 'updateExistedData',
					},
				],
				default: 'createNewData',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
				displayName: 'Form',
				name: 'form',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getFormOptions',
					loadOptionsDependsOn: ['credentials'],
				},
				default: '',
				description:
					'Only the forms that you are the admin user would show in this list. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Record Index',
				name: 'recordIndex',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						action: ['updateExistedData'],
					},
				},
				default: '',
				description:
					'You can find the Record Index from the URL. Record URL structure: http://{domain}/{database}/{path}/{form}/{record index}?.',
			},
			{
				displayName: 'JSON Body',
				name: 'jsonBody',
				type: 'json',
				default: '',
				description: 'Please refer to <a href="https://www.ragic.com/intl/en/doc-api">here</a>',
			},
		],
	};

	methods = {
		loadOptions: {
			async getFormOptions(this: ILoadOptionsFunctions) {
				const credentials = await this.getCredentials('ragicApi');
				const serverName = credentials?.serverName as string;
				const apiKey = credentials?.apiKey as string;
				const responseString = (await this.helpers.request({
					method: 'GET',
					url: `https://${serverName}/api/http/integromatForms.jsp?n8n`,
					headers: {
						Authorization: `Basic ${apiKey}`,
					},
				})) as string;

				const responseArray = jsonParse(responseString) as [];

				return responseArray.map((form: { displayName: string; path: string }) => ({
					name: form.displayName,
					value: form.path,
				}));
			},
		},
	};

	async execute(
		this: IExecuteFunctions,
	): Promise<INodeExecutionData[][] | NodeExecutionWithMetadata[][] | null> {
		// 獲取憑據
		const credentials = await this.getCredentials('ragicApi');

		// 獲取 serverName
		const serverName = credentials?.serverName as string;
		const apiKey = credentials?.apiKey as string;
		const path = this.getNodeParameter('form', 0);
		let recordIndex;
		try {
			recordIndex = '/' + (this.getNodeParameter('recordIndex', 0) as string);
		} catch (error) {
			recordIndex = '';
		}

		// 構建 baseURL
		const baseURL = `https://${serverName}/${path}${recordIndex}?api&n8n`;

		// 執行 API 請求
		const response = (await this.helpers.request({
			method: 'POST',
			url: `${baseURL}`,
			headers: {
				Authorization: `Basic ${apiKey}`,
			},
			body: this.getNodeParameter('jsonBody', 0),
		})) as string;

		// 確保返回的是 JSON 格式
		let parsedResponse;
		try {
			parsedResponse = (
				typeof response === 'string' ? JSON.parse(response) : response
			) as IDataObject;
		} catch (error) {
			throw new ApplicationError('Failed to parse API response as JSON.');
		}

		// 返回結構化 JSON 數據
		return [this.helpers.returnJsonArray(parsedResponse)];
	}
}
