import { INodeProperties } from 'n8n-workflow';

export const tableTransformationDescription: INodeProperties[] = [
	{
		displayName: 'Operation Type',
		name: 'operationType',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Simplify',
				value: 'simplify',
			},
			{
				name: 'Summarize',
				value: 'summarize',
			},
			{
				name: 'Reconfigure',
				value: 'reconfigure',
			},
		],
		default: 'summarize',
		displayOptions: {
			show: {
				resource: ['itemList'],
				operation: ['tableTransformation'],
			},
		},
	},
	{
		displayName: 'Transform Operation',
		name: 'transformOperation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Combine Rows',
				value: 'combineRows',
			},
			{
				name: 'Extract Cell',
				value: 'extractCell',
			},
			{
				name: 'Extract Column(s)',
				value: 'extractColumn',
			},
			{
				name: 'Extract Row(s)',
				value: 'extractRow',
			},
			{
				name: 'Remove Duplicates',
				value: 'removeDuplicates',
			},
		],
		default: 'combineRows',
		displayOptions: {
			show: {
				resource: ['itemList'],
				operation: ['tableTransformation'],
				operationType: ['simplify'],
			},
		},
	},
	{
		displayName: 'Transform Operation',
		name: 'transformOperation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Count Rows and Columns',
				value: 'countRowsAndColumns',
			},
			{
				name: 'Pivot Columns',
				value: 'pivotColumns',
			},
			{
				name: 'Unpivot Columns',
				value: 'unpivotColumns',
			},
		],
		default: 'combineRows',
		displayOptions: {
			show: {
				resource: ['itemList'],
				operation: ['tableTransformation'],
				operationType: ['summarize'],
			},
		},
	},
];
