import alasql from 'alasql';
import type { Database } from 'alasql';
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

export const properties: INodeProperties[] = [
	numberInputsProperty,
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: 'SELECT * FROM input1 LEFT JOIN input2 ON input1.name = input2.id',
		noDataExpression: true,
		description: 'Input data available as tables with corresponding number, e.g. input1, input2',
		hint: 'Supports <a href="https://github.com/alasql/alasql/wiki/Supported-SQL-statements" target="_blank">most</a> of the SQL-99 language',
		required: true,
		typeOptions: {
			rows: 5,
			editor: 'sqlEditor',
		},
	},
];

const displayOptions = {
	show: {
		mode: ['combineBySql'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	inputsData: INodeExecutionData[][],
): Promise<INodeExecutionData[][]> {
	const nodeId = this.getNode().id;
	const returnData: INodeExecutionData[] = [];
	const pairedItem: IPairedItemData[] = [];

	const db: typeof Database = new (alasql as any).Database(nodeId);

	try {
		for (let i = 0; i < inputsData.length; i++) {
			const inputData = inputsData[i];

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
		let query = this.getNodeParameter('query', 0) as string;

		for (const resolvable of getResolvables(query)) {
			query = query.replace(resolvable, this.evaluateExpression(resolvable, 0) as string);
		}

		const result: IDataObject[] = db.exec(query);

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

	return [returnData];
}
