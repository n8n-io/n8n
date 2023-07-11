import type { IExecuteFunctions } from 'n8n-core';
import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions, wrapData } from '@utils/utilities';
import { caseRLC, returnAllAndLimit } from '../../descriptions';
import { prepareRangeQuery, prepareSortQuery } from '../../helpers/utils';
import { theHiveApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	caseRLC,
	...returnAllAndLimit,
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
		operation: ['getMany'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	let responseData: IDataObject | IDataObject[] = [];

	const returnAll = this.getNodeParameter('returnAll', i);
	const options = this.getNodeParameter('options', i);
	const caseId = this.getNodeParameter('caseId', i, '', { extractValue: true }) as string;

	const qs: IDataObject = {};

	let limit = undefined;
	if (!returnAll) {
		limit = this.getNodeParameter('limit', i);
	}

	const body = {
		query: [
			{
				_name: 'getCase',
				idOrName: caseId,
			},
			{
				_name: 'observables',
			},
		],
	};

	prepareSortQuery(options.sort as string, body);

	if (limit !== undefined) {
		prepareRangeQuery(`0-${limit}`, body);
	}

	qs.name = 'observables';

	responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', body, qs);

	const executionData = this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});

	return executionData;
}
