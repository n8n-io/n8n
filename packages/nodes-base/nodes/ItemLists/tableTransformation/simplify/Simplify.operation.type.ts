import { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { SimplifyOperation } from '../types';
import * as combineRows from './combineRows.operation';
import * as extractCell from './extractCell.operation';
import * as extractColumn from './extractColumn.operation';
import * as extractRow from './extractRow.operation';
import * as removeDuplicates from './removeDuplicates.operation';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Combine Rows',
				value: 'combineRows',
				action: 'Combine Rows',
			},
			{
				name: 'Extract Cell',
				value: 'extractCell',
				action: 'Extract Cell',
			},
			{
				name: 'Extract Column(s)',
				value: 'extractColumn',
				action: 'Extract Column(s)',
			},
			{
				name: 'Extract Row(s)',
				value: 'extractRow',
				action: 'Extract Row(s)',
			},
			{
				name: 'Remove Duplicates',
				value: 'removeDuplicates',
				action: 'Remove Duplicates',
			},
		],
		default: 'combineRows',
		displayOptions: {
			show: {
				resource: ['tableTransformation'],
				operationType: ['simplify'],
			},
		},
	},
	...combineRows.description,
	...extractCell.description,
	...extractColumn.description,
	...extractRow.description,
	...removeDuplicates.description,
];

const operationMap = {
	combineRows,
	extractCell,
	extractColumn,
	extractRow,
	removeDuplicates,
};

export async function simplify(this: IExecuteFunctions, operation: SimplifyOperation) {
	return operationMap[operation].execute.call(this);
}
