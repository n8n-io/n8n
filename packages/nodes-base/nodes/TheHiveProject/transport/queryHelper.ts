import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';

import { theHiveApiRequest } from './requestApi';
import type { QueryScope } from '../helpers/interfaces';
import { constructFilter } from '../helpers/utils';

export async function theHiveApiQuery(
	this: IExecuteFunctions,
	scope: QueryScope,
	filters?: IDataObject[],
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
			_and: filters.filter((f) => f.field).map(constructFilter),
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
