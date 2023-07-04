import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { observableDataType, observableStatusSelector, tlpSelector } from '../common.description';
import { And, Between, ContainsString, Eq, In, prepareOptional } from '../../helpers/utils';
import type { IQueryObject } from '../../helpers/interfaces';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		default: {},
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: ['observable'],
				operation: ['search', 'count'],
			},
		},
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
];

const displayOptions = {
	show: {
		resource: ['observable'],
		operation: ['count'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const countQueryAttributs = prepareOptional(this.getNodeParameter('filters', i, {}));
	const _countSearchQuery: IQueryObject = And();

	for (const key of Object.keys(countQueryAttributs)) {
		if (key === 'dataType' || key === 'tags') {
			(_countSearchQuery._and as IQueryObject[]).push(
				In(key, countQueryAttributs[key] as string[]),
			);
		} else if (key === 'description' || key === 'keywork' || key === 'message') {
			(_countSearchQuery._and as IQueryObject[]).push(
				ContainsString(key, countQueryAttributs[key] as string),
			);
		} else if (key === 'range') {
			(_countSearchQuery._and as IQueryObject[]).push(
				Between(
					'startDate',
					((countQueryAttributs.range as IDataObject).dateRange as IDataObject).fromDate,
					((countQueryAttributs.range as IDataObject).dateRange as IDataObject).toDate,
				),
			);
		} else {
			(_countSearchQuery._and as IQueryObject[]).push(Eq(key, countQueryAttributs[key] as string));
		}
	}

	const body = {
		query: [
			{
				_name: 'listObservable',
			},
			{
				_name: 'filter',
				_and: _countSearchQuery._and,
			},
		],
	};

	body.query.push({
		_name: 'count',
	});

	const qs: IDataObject = {};

	qs.name = 'count-observables';

	responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

	responseData = { count: responseData };

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
