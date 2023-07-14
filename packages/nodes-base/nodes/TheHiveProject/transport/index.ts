import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';

import type { QueryScope } from '../helpers/interfaces';
import { constructFilter } from '../helpers/utils';

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

export async function theHiveApiQuery(
	this: IExecuteFunctions,
	scope: QueryScope,
	filters?: IDataObject | IDataObject[],
	sortFields?: IDataObject[],
	limit?: number,
	returnCount = false,
	extraData?: string[],
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

	let responseData: IDataObject[] = [];

	if (returnCount) {
		query.push({
			_name: 'count',
		});

		const count = await theHiveApiRequest.call(this, 'POST', '/v1/query', { query });

		responseData.push({ count });
	} else if (limit) {
		const pagination: IDataObject = {
			_name: 'page',
			from: 0,
			to: limit,
			extraData,
		};

		query.push(pagination);
		responseData = await theHiveApiRequest.call(this, 'POST', '/v1/query', { query });
	} else {
		let to = 500;
		let from = 0;
		let response: IDataObject[] = [];

		do {
			const pagination: IDataObject = {
				_name: 'page',
				from,
				to,
				extraData,
			};

			response = await theHiveApiRequest.call(this, 'POST', '/v1/query', {
				query: [...query, pagination],
			});

			responseData = responseData.concat(response || []);
			from = to;
			to += 500;
		} while (response?.length);
	}

	return responseData;
}
