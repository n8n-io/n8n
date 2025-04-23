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
				body: {
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

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;

			let responseData;

			try {
				switch (operation) {
					case 'createProspect': {
						const rawData = this.getNodeParameter('prospectData', i) as string;
						const prospectData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
						
						responseData = await this.helpers.request({
							method: 'POST',
							url: `${credentials.baseUrl}/Zapier/InsertProspect`,
							headers: {
								'Authorization': `Bearer ${authToken}`,
								'Content-Type': 'application/json',
							},
							body: prospectData,
							json: true,
						});
						break;
					}

					case 'createInsured': {
						const rawData = this.getNodeParameter('insuredData', i) as string;
						const insuredData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
						
						responseData = await this.helpers.request({
							method: 'POST',
							url: `${credentials.baseUrl}/Zapier/InsertInsured`,
							headers: {
								'Authorization': `Bearer ${authToken}`,
								'Content-Type': 'application/json',
							},
							body: insuredData,
							json: true,
						});
						break;
					}
	
					case 'createPolicy': {
						const rawData = this.getNodeParameter('policyData', i) as string;
						const policyData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
						
						responseData = await this.helpers.request({
							method: 'POST',
							url: `${credentials.baseUrl}/Zapier/InsertPolicy`,
							headers: {
								'Authorization': `Bearer ${authToken}`,
								'Content-Type': 'application/json',
							},
							body: policyData,
							json: true,
						});
						break;
					}

					case 'createTask': {
						const rawData = this.getNodeParameter('taskData', i) as string;
						const taskData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
					
						responseData = await this.helpers.request({
							method: 'POST',
							url: `${credentials.baseUrl}/Zapier/InsertTask`, // Adjust if your actual endpoint differs
							headers: {
								'Authorization': `Bearer ${authToken}`,
								'Content-Type': 'application/json',
							},
							body: taskData,
							json: true,
						});
						break;
					}					

					default:
						throw new NodeOperationError(this.getNode(), `Operation "${operation}" is not supported`);
				}

				if (responseData) {
					returnData.push({ json: responseData });
				}
			} catch (error) {
				if (error.response && error.response.body) {
					throw new NodeOperationError(this.getNode(), error.response.body);
				}
				throw new NodeOperationError(this.getNode(), error);
			}
		}

		return [returnData];
	}
}