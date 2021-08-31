import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

import {
	IDataObject,
	IPollFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import * as _ from 'lodash';

type RequestResponse = any;  // tslint:disable-line:no-any

/**
 * Make an API request to Grist
 */
export async function apiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	options: OptionsWithUri,
): Promise<RequestResponse> {
	const apiKey = (await this.getCredentials('gristApi'))?.apiKey;

	if (!apiKey) {
		throw new NodeOperationError(this.getNode(), 'No Grist API key found!');
	}

	options = {
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
		useQuerystring: false,
		json: true,
		...options,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}


export interface SortProperty {
	field: string;
	direction: 'asc' | 'desc';
}

export interface Filter {
	field: string;
	values: string[];
}

export interface RawListOptions {
	limit?: number;
	sort?: { property: SortProperty[] };
	filter?: { filter: Filter[] };
}

type FilterValues = Array<boolean | number | string>;

export function filterValues(values: string[]): FilterValues {
	const result: FilterValues = [...values];
	values.forEach(value => {
		const asFloat = parseFloat(value);
		if (!isNaN(asFloat)) {
			result.push(asFloat);
		} else if (value.toLowerCase() === 'true') {
			result.push(true);
		} else if (value.toLowerCase() === 'false') {
			result.push(false);
		}
	});
	return result;
}

export function parseListOptions(additionalOptions: RawListOptions) {
	const qs = {} as IDataObject;

	const sort = additionalOptions.sort?.property || [];
	if (sort.length) {
		qs.sort = sort
			.map(({field, direction}) => (direction === 'asc' ? '' : '-') + field)
			.join(',');
	}

	const filter = additionalOptions.filter?.filter || [];
	if (filter.length) {
		const pairs = filter.map(({field, values}) => [field, filterValues(values)]);
		qs.filter = JSON.stringify(_.fromPairs(pairs));
	}

	qs.limit = additionalOptions.limit || 100;
	return qs;
}

export function parseRecordId(id: string): number {
	const result = Number(id);
	if (parseInt(id, 10) !== result) {
		throw new Error(`Invalid record ID: '${id}' (must be an integer)`);
	}
	return result;
}

export interface ProcessedInputData<Record> {
	records: Record[];
	responses: RequestResponse[];
}

export async function processInputData<Record>(
		this: IExecuteFunctions,
		bulkSize: number,
		onError: (error: Error, data: IDataObject) => void,
		options: OptionsWithUri,
		bodyMapper: (records: Record[]) => any,	// tslint:disable-line:no-any
		itemMapper: (item: IDataObject, index: number) => Record,
): Promise<ProcessedInputData<Record>> {

	const records: Record[] = [];
	this.getInputData().forEach((item, index) => {
		try {
			records.push(itemMapper(item.json, index));
		} catch (error) {
			onError(error, {item});
		}
	});

	const result: ProcessedInputData<Record> = {records: [], responses: []};
	for (const batch of _.chunk(records, bulkSize)) {
		const body = bodyMapper(batch);
		try {
			const response = await apiRequest.call(this, {body, ...options});
			result.responses.push(response);
			result.records.push(...batch);  // only return successful records
		} catch (error) {
			onError(error, {body});
		}
	}

	return result;
}
