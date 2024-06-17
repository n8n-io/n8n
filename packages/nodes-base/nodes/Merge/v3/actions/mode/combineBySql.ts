import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
	IPairedItemData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getResolvables, updateDisplayOptions } from '@utils/utilities';
import { numberInputsProperty } from '../../helpers/descriptions';
import { getMergeNodeInputs, getNodeInputOrError } from '../../helpers/utils';

import alasql from 'alasql';
import type { Database } from 'alasql';

export const properties: INodeProperties[] = [
	numberInputsProperty,
	{
		displayName:
			'Input data available as tables with coresponding number(e.g. input1, input2), example:<br> <code>SELECT * FROM input1 LEFT JOIN input2 ON input1.name = input2.ID;</code>',
		name: 'queryTooltip',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		noDataExpression: true,
		required: true,
		typeOptions: {
			rows: 5,
			editor: 'sqlEditor',
		},
	},
	{
		displayName: 'Simplify Output',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];

const displayOptions = {
	show: {
		operation: ['combineBySql'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const nodeId = this.getNode().id;
	const returnData: INodeExecutionData[] = [];
	const pairedItem: IPairedItemData[] = [];

	const inputs = getMergeNodeInputs.call(this);

	const db: typeof Database = new (alasql as any).Database(nodeId);

	try {
		for (let i = 0; i < inputs.length; i++) {
			const inputData = getNodeInputOrError.call(this, i);

			inputData.forEach((item, index) => {
				if (item.pairedItem === undefined) {
					item.pairedItem = index;
				}

				if (typeof item.pairedItem === 'number') {
					pairedItem.push({
						item: item.pairedItem,
						input: i,
					});
					return;
				}

				if (Array.isArray(item.pairedItem)) {
					const pairedItems = item.pairedItem
						.filter((p) => p !== undefined)
						.map((p) => (typeof p === 'number' ? { item: p } : p))
						.map((p) => {
							return {
								item: p.item,
								input: i,
							};
						});
					pairedItem.push(...pairedItems);
					return;
				}

				pairedItem.push({
					item: item.pairedItem.item,
					input: i,
				});
			});

			db.exec(`CREATE TABLE input${i + 1}`);
			db.tables[`input${i + 1}`].data = inputData.map((entry) => entry.json);
		}
	} catch (error) {
		throw new NodeOperationError(this.getNode(), error, {
			message: 'Issue while creating table from',
			description: error.message,
			itemIndex: 0,
		});
	}

	try {
		const simplify = this.getNodeParameter('simplify', 0);
		let query = this.getNodeParameter('query', 0) as string;

		for (const resolvable of getResolvables(query)) {
			query = query.replace(resolvable, this.evaluateExpression(resolvable, 0) as string);
		}

		const result: IDataObject[] = db.exec(query);

		if (!simplify) {
			const isSingleStatment =
				query
					.replace(/\n/g, '')
					.split(';')
					.filter((q) => q).length === 1;

			if (isSingleStatment) {
				returnData.push({
					json: { statementIndex: 0, data: result },
					pairedItem,
				});
			} else {
				returnData.push(
					...result.map((item, index) => ({
						json: { statementIndex: index, data: item },
						pairedItem,
					})),
				);
			}
		} else {
			for (const item of result) {
				if (Array.isArray(item)) {
					returnData.push(...item.map((json) => ({ json, pairedItem })));
				} else if (typeof item === 'object') {
					returnData.push({ json: item, pairedItem });
				}
			}

			if (!returnData.length) {
				returnData.push({ json: { success: true }, pairedItem });
			}
		}
	} catch (error) {
		let message = '';
		if (typeof error === 'string') {
			message = error;
		} else {
			message = error.message;
		}
		throw new NodeOperationError(this.getNode(), error, {
			message: 'Issue while executing query',
			description: message,
			itemIndex: 0,
		});
	}

	delete alasql.databases[nodeId];

	return returnData;
}
