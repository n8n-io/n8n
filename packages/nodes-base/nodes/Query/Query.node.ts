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
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Treat incoming items as rows of a table',
						value: 'inputAsTable',
						action: 'Treat incoming items as rows of a table',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						name: 'Select properties in item to treat as a table',
						value: 'selectedProperties',
						action: 'Select properties in item to treat as a table',
					},
				],
				default: 'inputAsTable',
			},
			{
				displayName: 'In this mode the node will be executed only once',
				name: 'notice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						mode: ['inputAsTable'],
					},
				},
			},
			{
				displayName: 'Table Name',
				name: 'tableName',
				type: 'string',
				placeholder: 'e.g. my_table',
				default: 'items',
				required: true,
				description: "Use this name in 'Query' to reference your data",
				displayOptions: {
					show: {
						mode: ['inputAsTable'],
					},
				},
			},
			{
				displayName: 'Properties to Treat as Tables',
				name: 'selectedProperties',
				type: 'string',
				placeholder: 'e.g. users, teams',
				default: '',
				required: true,
				hint: 'Comma separated list of properties',
				requiresDataPath: 'multiple',
				description:
					'Specify the properties in the incoming items to treat as a table, property has to contain an array of objects',
				displayOptions: {
					show: {
						mode: ['selectedProperties'],
					},
				},
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
		const items = this.getInputData();
		const nodeId = this.getNode().id;
		const mode = this.getNodeParameter('mode', 0) as string;
		const returnData: INodeExecutionData[] = [];

		let executeTimes = 1;

		if (mode === 'selectedProperties') {
			executeTimes = items.length;
		}

		for (let i = 0; i < executeTimes; i++) {
			const db: typeof Database = new (alasql as any).Database(nodeId);
			const pairedItem = { item: i };

			try {
				if (mode === 'inputAsTable') {
					const tableName = this.getNodeParameter('tableName', i) as string;
					db.exec(`CREATE TABLE ${tableName}`);
					db.tables[tableName].data = items.map((item) => item.json);
				} else {
					const selectedProperties = (this.getNodeParameter('selectedProperties', i, '') as string)
						.split(',')
						.map((property) => property.trim());
					const item = items[i].json;

					for (const property of selectedProperties) {
						if (!Array.isArray(item[property])) {
							throw new NodeOperationError(
								this.getNode(),
								`The selected property ${property} is not an array`,
								{
									itemIndex: i,
								},
							);
						}
						db.exec(`CREATE TABLE ${property}`);
						db.tables[property].data = item[property];
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem });
					continue;
				}

				if (error instanceof NodeOperationError) throw error;

				throw new NodeOperationError(this.getNode(), error, {
					message: 'Issue while creating table',
					description: error.message,
					itemIndex: i,
				});
			}

			try {
				const simplify = this.getNodeParameter('simplify', i);
				let query = this.getNodeParameter('query', i) as string;

				for (const resolvable of getResolvables(query)) {
					query = query.replace(resolvable, this.evaluateExpression(resolvable, i) as string);
				}

				const result: IDataObject[] = db.exec(query);

				if (!simplify) {
					returnData.push(
						...result.map((item, index) => ({
							json: { statementIndex: index, data: item },
							pairedItem,
						})),
					);
				} else {
					for (const item of result) {
						if (Array.isArray(item)) {
							returnData.push(...item.map((json) => ({ json, pairedItem })));
						} else if (typeof item === 'object') {
							returnData.push({ json: item, pairedItem });
						}
					}

					if (!returnData.length) {
						returnData.push({ json: { success: true } });
					}
				}
			} catch (error) {
				let message = '';
				if (typeof error === 'string') {
					message = error;
				} else {
					message = error.message;
				}
				if (this.continueOnFail()) {
					returnData.push({ json: { error: message }, pairedItem });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error, {
					message: 'Issue while executing query',
					description: message,
					itemIndex: i,
				});
			}

			delete alasql.databases[nodeId];
		}

		return [returnData];
	}
}
