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
				resource: ['tableTransformation'],
			},
		},
	},
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
];
