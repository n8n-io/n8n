import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

export class Momentum implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Momentum',
		name: 'momentum',
		icon: 'file:momentum.svg',
		group: ['transform'],
		version: 1,
		description: 'Integrate with NowCerts API',
		defaults: {
			name: 'Momentum',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'momentumApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{ name: 'Create Prospect', value: 'createProspect' },
					{ name: 'Create Insured', value: 'createInsured' },
					{ name: 'Create Policy', value: 'createPolicy' },
					{ name: 'Create Task', value: 'createTask' },
				],
				default: 'createProspect',
			},
			{
				displayName: 'Prospect Data',
				name: 'prospectData',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['createProspect'],
					},
				},
				default: '',
			},
			{
				displayName: 'Insured Data',
				name: 'insuredData',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['createInsured'],
					},
				},
				default: '',
			},
			{
				displayName: 'Policy Data',
				name: 'policyData',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['createPolicy'],
					},
				},
				default: '',
			},
			{
				displayName: 'Task Data',
				name: 'taskData',
				type: 'json',
				displayOptions: {
					show: {
						operation: ['createTask'],
					},
				},
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Get credentials
		const credentials = await this.getCredentials('momentumApi') as {
			baseUrl: string;
			username: string;
			password: string;
			clientId: string;
		};

		// Get authentication token
		let authToken: string;
		try {
			const tokenResponse = await this.helpers.request({
				method: 'POST',
				url: `${credentials.baseUrl}/token`,
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				form: {
					grant_type: 'password',
					username: credentials.username,
					password: credentials.password,
					client_id: credentials.clientId,
				},
				json: true,
			});

			if (!tokenResponse.access_token) {
				throw new NodeOperationError(this.getNode(), 'Authentication failed: No access token received');
			}

			authToken = tokenResponse.access_token;
		} catch (error) {
			throw new NodeOperationError(this.getNode(), 'Authentication failed. Please check your credentials.');
		}

		// Reusable request function
		const makeApiRequest = async (endpoint: string, data: any) => {
			return this.helpers.request({
				method: 'POST',
				url: `${credentials.baseUrl}${endpoint}`,
				headers: {
					Authorization: `Bearer ${authToken}`,
					'Content-Type': 'application/json',
				},
				body: data,
				json: true,
			});
		};

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;

			try {
				let endpoint = '';
				let rawData = '';
				let data: any;

				switch (operation) {
					case 'createProspect':
						endpoint = '/Zapier/InsertProspect';
						rawData = this.getNodeParameter('prospectData', i) as string;
						break;
					case 'createInsured':
						endpoint = '/Zapier/InsertInsured';
						rawData = this.getNodeParameter('insuredData', i) as string;
						break;
					case 'createPolicy':
						endpoint = '/Zapier/InsertPolicy';
						rawData = this.getNodeParameter('policyData', i) as string;
						break;
					case 'createTask':
						endpoint = '/Zapier/InsertTask';
						rawData = this.getNodeParameter('taskData', i) as string;
						break;
					default:
						throw new NodeOperationError(this.getNode(), `Operation "${operation}" is not supported`);
				}

				// Safely parse JSON
				try {
					data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
				} catch (parseError) {
					throw new NodeOperationError(this.getNode(), 'Invalid JSON input provided.');
				}

				const responseData = await makeApiRequest(endpoint, data);

				if (responseData) {
					returnData.push({ json: responseData });
				}
			} catch (error) {
				if (error.response?.body) {
					throw new NodeOperationError(this.getNode(), error.response.body);
				}
				throw new NodeOperationError(this.getNode(), error);
			}
		}

		return [returnData];
	}
}
