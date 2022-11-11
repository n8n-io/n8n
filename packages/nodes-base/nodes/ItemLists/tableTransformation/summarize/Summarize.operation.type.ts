import { IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { SummarizeOperation } from '../types';
import * as countRowsAndColumns from './countRowsAndColumns.operation';
import * as pivotColumns from './pivotColumns.operation';
import * as unpivotColumns from './unpivotColumns.operation';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Count Rows and Columns',
				value: 'countRowsAndColumns',
				action: 'Count Rows and Columns',
			},
			{
				name: 'Pivot Columns',
				value: 'pivotColumns',
				action: 'Pivot Columns',
			},
			{
				name: 'Unpivot Columns',
				value: 'unpivotColumns',
				action: 'Unpivot Columns',
			},
		],
		default: 'countRowsAndColumns',
		displayOptions: {
			show: {
				resource: ['tableTransformation'],
				operationType: ['summarize'],
			},
		},
	},
	...countRowsAndColumns.description,
	...pivotColumns.description,
	...unpivotColumns.description,
];

const operationMap = {
	countRowsAndColumns,
	pivotColumns,
	unpivotColumns,
};

export async function summarize(this: IExecuteFunctions, operation: SummarizeOperation) {
	return operationMap[operation].execute.call(this);
}
