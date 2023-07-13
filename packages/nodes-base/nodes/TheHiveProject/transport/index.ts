import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';

import type { QueryScope } from '../helpers/interfaces';

export async function theHiveApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject | FormData = {},
	query: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
) {
	const credentials = await this.getCredentials('theHiveProjectApi');

	let options: IHttpRequestOptions = {
		method,
		qs: query,
		url: uri || `${credentials.url}/api${resource}`,
		body,
		skipSslCertificateValidation: credentials.allowUnauthorizedCerts as boolean,
		json: true,
	};

	if (Object.keys(option).length !== 0) {
		options = Object.assign({}, options, option);
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	if (Object.keys(query).length === 0) {
		delete options.qs;
	}
	return this.helpers.requestWithAuthentication.call(this, 'theHiveProjectApi', options);
}

function constructFilter(entry: IDataObject) {
	const { field, value } = entry;
	let { operator } = entry;

	if (operator === undefined) {
		operator = '_eq';
	}

	if (operator === '_between') {
		const { from, to } = entry;
		return {
			_between: {
				_field: field,
				_from: from,
				_to: to,
			},
		};
	}

	if (operator === '_in') {
		const { values } = entry;
		return {
			_in: {
				_field: field,
				_values: typeof values === 'string' ? values.split(',').map((v) => v.trim()) : values,
			},
		};
	}

	return {
		[operator as string]: {
			_field: field,
			_value: value,
		},
	};
}

export async function theHiveApiQuery(
	this: IExecuteFunctions,
	scope: QueryScope,
	filters?: IDataObject | IDataObject[],
	sortFields?: IDataObject[],
	limit?: number,
	returnCount = false,
) {
	const query: IDataObject[] = [];

	if (scope.id) {
		query.push({
			_name: scope.query,
			idOrName: scope.id,
		});
	} else {
		query.push({
			_name: scope.query,
		});
	}

	if (scope.restrictTo) {
		query.push({
			_name: scope.restrictTo,
		});
	}

	if (filters && Array.isArray(filters) && filters.length) {
		const filter = {
			_name: 'filter',
			_and: filters.map(constructFilter),
		};

		query.push(filter);
	}

	if (sortFields?.length && !returnCount) {
		const sort = {
			_name: 'sort',
			_fields: sortFields.map((field) => {
				return {
					[`${field.field as string}`]: field.direction as string,
				};
			}),
		};

		query.push(sort);
	}

	if (returnCount) {
		query.push({
			_name: 'count',
		});
	}

	if (limit && !returnCount) {
		const pagination = {
			_name: 'page',
			from: 0,
			to: limit,
		};

		query.push(pagination);
	}

	const responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', { query });

	return responseData;
}
