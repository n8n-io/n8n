import {
	IDataObject,
	IWebhookFunctions,
	INodeTypeDescription,
	INodeType,
	IWebhookResponseData,
	NodeConnectionType,
	IHookFunctions,
} from 'n8n-workflow';

// TODO: this should be picked up from a config object
const baseUrl = 'http://localhost:8080/rest/mailhooks';
const apiRequest = async (
	context: IHookFunctions,
	operation: 'checkExists' | 'create' | 'delete',
) => {
	const { webhookId } = context.getNode();
	const domain = context.getDomain();
	const method = operation === 'checkExists' ? 'GET' : operation === 'create' ? 'POST' : 'DELETE';
	let url = baseUrl;
	if (operation !== 'create') {
		url += `/${webhookId}@${domain}`;
	}
	const response = await context.helpers.httpRequest({
		url,
		method,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	});
	return response.statusCode === 204;
};

export class Mailhook implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Mailhook',
		name: 'mailhook',
		icon: 'file:mailhook.svg',
		group: ['trigger'],
		version: 1,
		description: 'Start a workflow on a Mailhook trigger',
		defaults: {
			name: 'Mailhook',
			color: '#4363AE',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
				ndvHideMethod: true,
			},
		],
		properties: [],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return await apiRequest(this, 'checkExists');
			},
			async create(this: IHookFunctions): Promise<boolean> {
				return await apiRequest(this, 'create');
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				return await apiRequest(this, 'delete');
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// The data to return and so start the workflow with
		const returnData: IDataObject[] = [];
		returnData.push({
			headers: this.getHeaderData(),
			params: this.getParamsData(),
			query: this.getQueryData(),
			body: this.getBodyData(),
		});

		return {
			workflowData: [this.helpers.returnJsonArray(returnData)],
		};
	}
}
