import {
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import alasql from 'alasql';
import type { Database } from 'alasql';
import { getResolvables } from '../../utils/utilities';

export class Query implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Query',
		name: 'query',
		icon: 'file:query.svg',
		group: ['input'],
		version: 1,
		description: 'Query your data by executing SQL queries',
		defaults: {
			name: 'Query',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName:
					'This node will be executed only once, incoming items would be treated as rows of a table.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Table Name',
				name: 'tableName',
				type: 'string',
				placeholder: 'e.g. my_table',
				default: 'items',
				required: true,
				description: "Use this name in 'Query' to reference your data",
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				default: '',
				noDataExpression: true,
				required: true,
				typeOptions: {
					editor: 'sqlEditor',
				},
			},
			{
				displayName: 'Simplify Output',
				name: 'simplify',
				type: 'boolean',
				default: true,
				description:
					'Whether to return a simplified version of the response instead of the raw data',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const returnData: INodeExecutionData[] = [];
		const nodeId = this.getNode().id;
		const db: typeof Database = new (alasql as any).Database(nodeId);

		const tableName = this.getNodeParameter('tableName', 0) as string;
		let query = this.getNodeParameter('query', 0) as string;

		for (const resolvable of getResolvables(query)) {
			query = query.replace(resolvable, this.evaluateExpression(resolvable, 0) as string);
		}
		const simplify = this.getNodeParameter('simplify', 0);
		db.exec(`CREATE TABLE ${tableName}`);

		const items = this.getInputData();
		db.tables[tableName].data = items.map((item) => item.json);

		try {
			const result: IDataObject[] = db.exec(query);

			if (!simplify) {
				returnData.push(
					...result.map((item, index) => ({
						json: { statementIndex: index, data: item },
					})),
				);
			} else {
				for (const item of result) {
					if (Array.isArray(item)) {
						returnData.push(...item.map((json) => ({ json })));
					}
				}
			}
		} catch (error) {
			throw new NodeOperationError(this.getNode(), error, {
				message: 'Issue while executing query',
				description: error.message,
			});
		}

		if (!returnData.length && simplify) {
			returnData.push({ json: { success: true } });
		}

		delete alasql.databases[nodeId];
		return [returnData];
	}
}
