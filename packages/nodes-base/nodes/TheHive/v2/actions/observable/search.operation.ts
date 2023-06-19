import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '../../../../../utils/utilities';
import { observableDataType, observableStatusSelector, tlpSelector } from '../common.description';

const properties: INodeProperties[] = [
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		placeholder: 'Add Filter',
		options: [
			{
				...observableDataType,
				type: 'multiOptions',
			},
			{
				displayName: 'Date Range',
				type: 'fixedCollection',
				name: 'range',
				default: {},
				options: [
					{
						displayName: 'Add Date Range Inputs',
						name: 'dateRange',
						values: [
							{
								displayName: 'From Date',
								name: 'fromDate',
								type: 'dateTime',
								default: '',
							},
							{
								displayName: 'To Date',
								name: 'toDate',
								type: 'dateTime',
								default: '',
							},
						],
					},
				],
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				placeholder: 'exp,freetext',
			},
			{
				displayName: 'IOC',
				name: 'ioc',
				type: 'boolean',
				default: false,
				description: 'Whether the observable is an IOC (Indicator of compromise)',
			},
			{
				displayName: 'Keyword',
				name: 'keyword',
				type: 'string',
				default: '',
				placeholder: 'exp,freetext',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				description: 'Description of the observable in the context of the case',
			},
			{
				displayName: 'Observable Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'tag1,tag2',
			},
			{
				displayName: 'Sighted',
				name: 'sighted',
				type: 'boolean',
				default: false,
			},
			observableStatusSelector,
			tlpSelector,
			{
				displayName: 'Value',
				name: 'data',
				type: 'string',
				default: '',
				placeholder: 'example.com; 8.8.8.8',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				type: 'string',
				placeholder: '±Attribut, exp +status',
				description: 'Specify the sorting attribut, + for asc, - for desc',
				default: '',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['observable'],
		operation: ['search'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const responseData: IDataObject[] = [];

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
