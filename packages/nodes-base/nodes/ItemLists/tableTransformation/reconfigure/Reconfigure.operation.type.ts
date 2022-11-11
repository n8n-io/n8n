import { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { ReconfigureOperation } from '../types';
import * as expandNestedFields from './expandNestedFields.operation';
import * as flipTable from './flipTable.operation';
import * as splitColumn from './splitColumn.operation';
import * as sort from './sort.operation';
import * as updateColumnHeaders from './updateColumnHeaders.operation';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Expand Nested Fields',
				value: 'expandNestedFields',
				action: 'Expand Nested Fields',
			},
			{
				name: 'Flip Table (Transpose)',
				value: 'flipTable',
				action: 'Flip Table (Transpose)',
			},
			{
				name: 'Sort',
				value: 'sort',
				action: 'Sort',
			},
			{
				name: 'Split Column',
				value: 'splitColumn',
				action: 'Split Column',
			},
			{
				name: 'Update Column Headers',
				value: 'updateColumnHeaders',
				action: 'Update Column Headers a table transformation',
			},
		],
		default: 'expandNestedFields',
		displayOptions: {
			show: {
				resource: ['tableTransformation'],
				operationType: ['reconfigure'],
			},
		},
	},
	...expandNestedFields.description,
	...flipTable.description,
	...sort.description,
	...splitColumn.description,
	...updateColumnHeaders.description,
];

const operationMap = {
	expandNestedFields,
	flipTable,
	splitColumn,
	sort,
	updateColumnHeaders,
};

export async function reconfigure(this: IExecuteFunctions, operation: ReconfigureOperation) {
	return operationMap[operation].execute.call(this);
}
