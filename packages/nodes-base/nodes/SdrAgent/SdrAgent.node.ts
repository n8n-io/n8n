import {
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IExecuteFunctions,
	INodeExecutionData,
	NodeConnectionType,
} from 'n8n-workflow';
import { getDbConnection } from '@utils/db';

export class SdrAgent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SDR Agent',
		name: 'sdrAgent',
		group: ['input'],
		version: 1,
		description: 'Select an SDR Agent and Segment.',
		defaults: {
			name: 'SDR Agent',
			color: '#1F72E5',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'SDR Agent',
				name: 'sdrAgentId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSDRAgents',
				},
				default: '',
				description: 'Select an SDR Agent',
			},
			{
				displayName: 'Segment',
				name: 'segmentId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSegments',
					loadOptionsDependsOn: ['sdrAgentId'],
				},
				default: '',
				description: 'Select a Segment',
			},
		],
	};

	methods = {
		loadOptions: {
			async getSDRAgents(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const objectInfo = Object.assign(this);
				const userId = objectInfo?.additionalData?.userId;
				let result: { name: string; value: number }[] = [];
				if (userId) {
					const connection = await getDbConnection();
					let [company] = await connection.execute(
						'SELECT * FROM companies WHERE workflow_acc_id = ?',
						[userId],
					);
					company = company as any[];
					const companyInfo = company[0] as any;
					const companyId = companyInfo.id;
					const [rows] = await connection.execute(
						'SELECT id, agent_identifier_name FROM sdr_agents WHERE company_id = ? AND status = ?',
						[companyId, 'active'],
					);
					result = (rows as { id: number; agent_identifier_name: string }[]).map((row) => ({
						name: row.agent_identifier_name,
						value: row.id,
					}));
				}
				return result;
			},

			async getSegments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const sdrAgentId = this.getNodeParameter('sdrAgentId') as number;
				if (!sdrAgentId) return [];

				const objectInfo = Object.assign(this);
				const userId = objectInfo?.additionalData?.userId;
				let result: { name: string; value: number }[] = [];

				if (userId) {
					const connection = await getDbConnection();
					let [company] = await connection.execute(
						'SELECT * FROM companies WHERE workflow_acc_id = ?',
						[userId],
					);
					company = company as any[];
					const companyInfo = company[0] as any;
					const companyId = companyInfo.id;

					const [rows] = await connection.execute(
						'SELECT id, name FROM segments WHERE company_id = ? AND status = ?',
						[companyId, 'active'],
					);

					result = (rows as { id: number; name: string }[]).map((row) => ({
						name: row.name,
						value: row.id,
					}));
				}

				return result;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const sdrAgentId = this.getNodeParameter('sdrAgentId', 0) as number;
		const segmentId = this.getNodeParameter('segmentId', 0) as number;
		return [
			[
				{
					json: {
						sdrAgentId,
						segmentId,
					},
				},
			],
		];
	}
}
