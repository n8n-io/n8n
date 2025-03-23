import {
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	NodeConnectionType,
} from 'n8n-workflow';
import mysql from 'mysql2/promise';

export class MyCustomNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'My Custom Node',
		name: 'myCustomNode',
		group: ['transform'],
		version: 1,
		description: 'A custom node with cascading dropdowns',
		defaults: {
			name: 'My Custom Node',
			color: '#1F72E5',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'User',
				name: 'userId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getUsers',
				},
				default: '',
				description: 'Select a user from the database',
			},
			{
				displayName: 'Segment',
				name: 'segmentId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getSegments',
					loadOptionsDependsOn: ['userId'],
				},
				default: '',
				description: 'Select a segment based on the user',
			},
			{
				displayName: 'Action',
				name: 'actionId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getActions',
					loadOptionsDependsOn: ['segmentId'],
				},
				default: '',
				description: 'Select an action based on the segment',
			},
		],
	};

	methods = {
		loadOptions: {
			async getUsers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const connection = await mysql.createConnection({
					host: 'localhost',
					user: 'root',
					password: 'admin',
					database: 'ciara_production',
				});

				const [rows] = await connection.execute('SELECT id, first_name FROM users');
				connection.end();

				return (rows as { id: string; first_name: string }[]).map((row) => ({
					name: row.first_name,
					value: row.id,
				}));
			},

			async getSegments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const userId = this.getNodeParameter('userId') as string;
				if (!userId) return [];

				const connection = await mysql.createConnection({
					host: 'localhost',
					user: 'root',
					password: 'admin',
					database: 'ciara_production',
				});

				const [rows] = await connection.execute('SELECT id, name FROM segments WHERE user_id = ?', [
					userId,
				]);
				connection.end();

				return (rows as { id: string; name: string }[]).map((row) => ({
					name: row.name,
					value: row.id,
				}));
			},

			// async getActions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
			//     const segmentId = this.getNodeParameter('segmentId') as string;
			//     if (!segmentId) return [];

			//     const rows = [];

			//     return (rows as { id: string; name: string }[]).map((row) => ({
			//         name: row.name,
			//         value: row.id,
			//     }));
			// },
		},
	};
}
