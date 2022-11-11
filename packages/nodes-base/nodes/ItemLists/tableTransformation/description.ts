import { INodeProperties } from 'n8n-workflow';
import * as simplify from './simplify/Simplify.operation.type';
import * as summarize from './summarize/Summarize.operation.type';
import * as reconfigure from './reconfigure/Reconfigure.operation.type';

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
	...reconfigure.description,
	...simplify.description,
	...summarize.description,
];
