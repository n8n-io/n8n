import { Container } from '@n8n/di';
import alasql from 'alasql';
import type { Database } from 'alasql';
import { ErrorReporter } from 'n8n-core';
import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeProperties,
	IPairedItemData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getResolvables, updateDisplayOptions } from '@utils/utilities';

import { numberInputsProperty } from '../../helpers/descriptions';
import { modifySelectQuery, rowToExecutionData } from '../../helpers/utils';

function disableAlasqlFileAccess() {
	const disabledFunction = () => {
		throw new Error('File access operations are disabled for security reasons');
	};

	// Cast alasql to any to access internal properties
	const alasqlAny = alasql as any;

	// Disable file reading functions that could be used to access the file system
	if (alasqlAny.fn) {
		alasqlAny.fn.FILE = disabledFunction;
		alasqlAny.fn.JSON = disabledFunction;
		alasqlAny.fn.TXT = disabledFunction;
		alasqlAny.fn.CSV = disabledFunction;
		alasqlAny.fn.XLSX = disabledFunction;
		alasqlAny.fn.XLS = disabledFunction;
		alasqlAny.fn.LOAD = disabledFunction;
		alasqlAny.fn.SAVE = disabledFunction;
	}

	// Also disable the FROM handlers which are used for file operations
	if (alasqlAny.from) {
		alasqlAny.from.FILE = disabledFunction;
		alasqlAny.from.JSON = disabledFunction;
		alasqlAny.from.TXT = disabledFunction;
		alasqlAny.from.CSV = disabledFunction;
		alasqlAny.from.XLSX = disabledFunction;
		alasqlAny.from.XLS = disabledFunction;
	}

	// Override the engines that handle file operations
	if (alasqlAny.engines) {
		alasqlAny.engines.FILE = disabledFunction;
		alasqlAny.engines.JSON = disabledFunction;
		alasqlAny.engines.TXT = disabledFunction;
		alasqlAny.engines.CSV = disabledFunction;
		alasqlAny.engines.XLSX = disabledFunction;
		alasqlAny.engines.XLS = disabledFunction;
	}
}

type OperationOptions = {
	emptyQueryResult: 'success' | 'empty';
};

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
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Empty Query Result',
				name: 'emptyQueryResult',
				type: 'options',
				description: 'What to return if the query executed successfully but returned no results',
				options: [
					{
						name: 'Success',
						value: 'success',
					},
					{
						name: 'Empty Result',
						value: 'empty',
					},
				],
				default: 'empty',
			},
		],
		displayOptions: {
			show: {
				'@version': [3.2],
			},
		},
	},
];

const displayOptions = {
	show: {
		mode: ['combineBySql'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

const prepareError = (node: INode, error: Error) => {
	let message = '';
	if (typeof error === 'string') {
		message = error;
	} else {
		message = error.message;
	}
	throw new NodeOperationError(node, error, {
		message: 'Issue while executing query',
		description: message,
		itemIndex: 0,
	});
};

async function executeSelectWithMappedPairedItems(
	node: INode,
	inputsData: INodeExecutionData[][],
	query: string,
	returnSuccessItemIfEmpty: boolean,
): Promise<INodeExecutionData[][]> {
	const returnData: INodeExecutionData[] = [];

	const db: typeof Database = new (alasql as any).Database(node.id);

	try {
		for (let i = 0; i < inputsData.length; i++) {
			const inputData = inputsData[i];

			db.exec(`CREATE TABLE input${i + 1}`);
			db.tables[`input${i + 1}`].data = inputData.map((entry) => ({
				...entry.json,
				pairedItem: entry.pairedItem,
			}));
		}
	} catch (error) {
		throw new NodeOperationError(node, error, {
			message: 'Issue while creating table from',
			description: error.message,
			itemIndex: 0,
		});
	}

	try {
		const result: IDataObject[] = db.exec(modifySelectQuery(query, inputsData.length));

		for (const item of result) {
			if (Array.isArray(item)) {
				returnData.push.apply(returnData, item.map(rowToExecutionData));
			} else if (typeof item === 'object') {
				returnData.push(rowToExecutionData(item));
			}
		}

		if (!returnData.length && returnSuccessItemIfEmpty) {
			returnData.push({ json: { success: true } });
		}
	} catch (error) {
		prepareError(node, error as Error);
	} finally {
		delete alasql.databases[node.id];
	}

	return [returnData];
}

export async function execute(
	this: IExecuteFunctions,
	inputsData: INodeExecutionData[][],
): Promise<INodeExecutionData[][]> {
	disableAlasqlFileAccess();

	const node = this.getNode();
	const returnData: INodeExecutionData[] = [];
	const pairedItem: IPairedItemData[] = [];
	const options = this.getNodeParameter('options', 0, {}) as OperationOptions;

	let query = this.getNodeParameter('query', 0) as string;

	for (const resolvable of getResolvables(query)) {
		query = query.replace(resolvable, this.evaluateExpression(resolvable, 0) as string);
	}

	const isSelectQuery = node.typeVersion >= 3.1 ? query.toLowerCase().startsWith('select') : false;
	const returnSuccessItemIfEmpty =
		node.typeVersion <= 3.1 ? true : options.emptyQueryResult === 'success';

	if (isSelectQuery) {
		try {
			return await executeSelectWithMappedPairedItems(
				node,
				inputsData,
				query,
				returnSuccessItemIfEmpty,
			);
		} catch (error) {
			Container.get(ErrorReporter).error(error, {
				extra: {
					nodeName: node.name,
					nodeType: node.type,
					nodeVersion: node.typeVersion,
					workflowId: this.getWorkflow().id,
				},
			});
		}
	}

	const db: typeof Database = new (alasql as any).Database(node.id);

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
					pairedItem.push.apply(pairedItem, pairedItems);
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
		throw new NodeOperationError(node, error, {
			message: 'Issue while creating table from',
			description: error.message,
			itemIndex: 0,
		});
	}

	try {
		const result: IDataObject[] = db.exec(query);

		for (const item of result) {
			if (Array.isArray(item)) {
				returnData.push.apply(
					returnData,
					item.map((json) => ({ json, pairedItem })),
				);
			} else if (typeof item === 'object') {
				returnData.push({ json: item, pairedItem });
			}
		}

		if (!returnData.length && returnSuccessItemIfEmpty) {
			returnData.push({ json: { success: true }, pairedItem });
		}
	} catch (error) {
		prepareError(node, error as Error);
	} finally {
		delete alasql.databases[node.id];
	}

	return [returnData];
}
