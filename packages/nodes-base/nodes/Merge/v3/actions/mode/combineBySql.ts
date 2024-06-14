import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getResolvables, updateDisplayOptions } from '@utils/utilities';
import { numberInputsProperty } from '../../helpers/descriptions';
import { getMergeNodeInputs } from '../../helpers/utils';

import alasql from 'alasql';
import type { Database } from 'alasql';

export const properties: INodeProperties[] = [
	numberInputsProperty,
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		noDataExpression: true,
		required: true,
		hint: 'Input data available as tables with coresponding number, e.g. input1, input2, ...',
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

	const inputs = getMergeNodeInputs(this);

	const db: typeof Database = new (alasql as any).Database(nodeId);

	try {
		for (let i = 0; i < inputs.length; i++) {
			const inputData = this.getInputData(i) ?? [];
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
			returnData.push(
				...result.map((item, index) => ({
					json: { statementIndex: index, data: item },
				})),
			);
		} else {
			for (const item of result) {
				if (Array.isArray(item)) {
					returnData.push(...item.map((json) => ({ json })));
				} else if (typeof item === 'object') {
					returnData.push({ json: item });
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
		throw new NodeOperationError(this.getNode(), error, {
			message: 'Issue while executing query',
			description: message,
			itemIndex: 0,
		});
	}

	delete alasql.databases[nodeId];

	return returnData;
}
