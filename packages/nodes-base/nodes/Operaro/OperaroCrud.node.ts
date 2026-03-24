import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

const RESOURCE_MAP: Record<string, string> = {
	product: '/api/commerce/products',
	order: '/api/commerce/orders',
	customer: '/api/customer/contacts',
	contentPost: '/api/social-content/posts',
	campaign: '/api/social-content/campaigns',
	notification: '/api/notification/send',
	employee: '/api/app/employees',
	media: '/api/media',
};

export class OperaroCrud implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Operaro',
		name: 'operaroCrud',
		icon: 'file:operaro.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'CRUD operations on Operaro platform entities',
		defaults: {
			name: 'Operaro',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'operaroApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Campaign', value: 'campaign' },
					{ name: 'Content Post', value: 'contentPost' },
					{ name: 'Customer', value: 'customer' },
					{ name: 'Employee', value: 'employee' },
					{ name: 'Media', value: 'media' },
					{ name: 'Notification', value: 'notification' },
					{ name: 'Order', value: 'order' },
					{ name: 'Product', value: 'product' },
				],
				default: 'product',
				required: true,
				description: 'The Operaro resource to operate on',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Create', value: 'create' },
					{ name: 'Delete', value: 'delete' },
					{ name: 'Get', value: 'get' },
					{ name: 'Get List', value: 'getList' },
					{ name: 'Update', value: 'update' },
				],
				default: 'getList',
				required: true,
				description: 'The operation to perform',
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['get', 'update', 'delete'],
					},
				},
				description: 'The ID of the entity',
			},
			{
				displayName: 'Body (JSON)',
				name: 'body',
				type: 'json',
				default: '{}',
				displayOptions: {
					show: {
						operation: ['create', 'update'],
					},
				},
				description: 'The JSON body to send with the request',
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'collection',
				placeholder: 'Add Parameter',
				default: {},
				displayOptions: {
					show: {
						operation: ['getList'],
					},
				},
				options: [
					{
						displayName: 'Filter',
						name: 'filter',
						type: 'string',
						default: '',
						description: 'Text filter for searching',
					},
					{
						displayName: 'Max Result Count',
						name: 'maxResultCount',
						type: 'number',
						default: 10,
						description: 'Maximum number of results to return',
					},
					{
						displayName: 'Skip Count',
						name: 'skipCount',
						type: 'number',
						default: 0,
						description: 'Number of results to skip for pagination',
					},
					{
						displayName: 'Sorting',
						name: 'sorting',
						type: 'string',
						default: '',
						description: 'Sort expression (e.g. "creationTime desc")',
					},
				],
			},
			{
				displayName: 'Tenant ID',
				name: 'tenantId',
				type: 'string',
				default: '',
				description:
					'Optionally specify a tenant ID header. Leave empty to use the default tenant.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = await this.getCredentials('operaroApi');
		const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');
		const tenantId = this.getNodeParameter('tenantId', 0, '') as string;

		const endpoint = RESOURCE_MAP[resource];
		if (!endpoint) {
			throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
		}

		for (let i = 0; i < items.length; i++) {
			try {
				let url = `${baseUrl}${endpoint}`;
				let method = 'GET';
				let body: unknown = undefined;
				const qs: Record<string, string | number> = {};

				const headers: Record<string, string> = {
					Authorization: `Bearer ${credentials.apiKey as string}`,
					'Content-Type': 'application/json',
				};

				if (tenantId) {
					headers['__tenant'] = tenantId;
				}

				switch (operation) {
					case 'get': {
						const id = this.getNodeParameter('id', i) as string;
						url = `${url}/${id}`;
						break;
					}
					case 'getList': {
						const queryParams = this.getNodeParameter('queryParameters', i, {}) as Record<
							string,
							string | number
						>;
						Object.entries(queryParams).forEach(([key, value]) => {
							if (value !== '' && value !== undefined) {
								qs[key] = value;
							}
						});
						break;
					}
					case 'create': {
						method = 'POST';
						const bodyStr = this.getNodeParameter('body', i) as string;
						body = typeof bodyStr === 'string' ? JSON.parse(bodyStr) : bodyStr;
						break;
					}
					case 'update': {
						const id = this.getNodeParameter('id', i) as string;
						url = `${url}/${id}`;
						method = 'PUT';
						const bodyStr = this.getNodeParameter('body', i) as string;
						body = typeof bodyStr === 'string' ? JSON.parse(bodyStr) : bodyStr;
						break;
					}
					case 'delete': {
						const id = this.getNodeParameter('id', i) as string;
						url = `${url}/${id}`;
						method = 'DELETE';
						break;
					}
				}

				const response = await this.helpers.httpRequest({
					method: method as 'GET' | 'POST' | 'PUT' | 'DELETE',
					url,
					body: body as Record<string, unknown> | undefined,
					qs,
					headers,
				});

				returnData.push({ json: response as Record<string, unknown> });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
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
