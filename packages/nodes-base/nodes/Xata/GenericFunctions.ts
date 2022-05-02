import {
	IExecuteFunctions
} from 'n8n-core';

import {
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	NodeApiError,
} from 'n8n-workflow';

export function getAdditionalOptions(additionalOptions: IDataObject) {

	const body = {} as IDataObject;

	for (const key in additionalOptions) {

		if (key === 'ignoreColumns' && additionalOptions[key] !== '') {

			body[key] = (additionalOptions[key] as string[]).map(el => typeof el === 'string' ? el.trim() : null);

		} else if ((key === 'filter' || key === 'sort') && additionalOptions[key] !== '') {

			try {

				body[key] = JSON.parse(additionalOptions[key] as string) as IDataObject;

			} catch (error) {

				throw new Error(`Cannot parse ${key} to JSON. Check the ${key} (JSON) option`);

			}

		} else if (additionalOptions[key]) {

			body[key] = additionalOptions[key];

		}
	}

	return body;
}

export function getItem(this: IExecuteFunctions, index: number, item: IDataObject) {

	const sendAll = this.getNodeParameter('sendAll', index) as boolean;

	if (!sendAll) {

		const columns = (this.getNodeParameter('columns', index, []) as string[])?.map(el => typeof el === 'string' ? el.trim() : null) as string[];
		const ignore = false;
		const returnData = filterItemsColumns(item, columns, ignore);
		return returnData;

	} else {

		const additionalOptions = this.getNodeParameter('additionalOptions', index, {}) as IDataObject;

		if (additionalOptions['ignoreColumns'] && additionalOptions['ignoreColumns'] !== '') {

			const columns = additionalOptions['ignoreColumns'] as string[];
			const ignore = true;
			const returnData = filterItemsColumns(item, columns, ignore);
			return returnData;

		} else {

			return item;

		}

	}

}

export function filterItemsColumns(item: IDataObject, filterColumns: string[], ignore: boolean) {

	const returnData = ignore ? item : {} as IDataObject; // if ignore column option is used, take the data and eliminate columns

	for (const key of filterColumns) {

		if (ignore) {

			delete returnData[key];

		} else {

			returnData[key] = item[key];

		}

	}

	return returnData;

}



export async function xataApiRequest(this: IExecuteFunctions, apiKey: string, method: IHttpRequestMethods, slug: string, database: string, branch: string, table: string, resource: string, body: IDataObject, option: IDataObject = {}, url?: string): Promise<any> { // tslint:disable-line:no-any

	const options: IHttpRequestOptions = {

		url: url || `https://${slug}.xata.sh/db/${database}:${branch}/tables/${table}/${resource}`,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey}`,
		},
		method,
		body,
		json: true,

	};

	if (Object.keys(option).length !== 0) {

		Object.assign(options, option);

	}

	try {

		const response = await this.helpers.httpRequest(options);
		return response;

	} catch (error) {

		throw new NodeApiError(this.getNode(), error);
	}

}

export async function xataApiList(this: IExecuteFunctions, apiKey: string, method: IHttpRequestMethods, slug: string, database: string, branch: string, table: string, resource: string, body: IDataObject, returnAll: boolean, url?: string): Promise<any> { // tslint:disable-line:no-any


	let records = new Array();

	if (returnAll) {

		try {

			let arrayLength = 0 as number;

			do {

				const response = await xataApiRequest.call(this, apiKey, 'POST', slug, database, branch, table, resource, body);
				const crs = response.meta.page.cursor;
				const recs = response.records;

				for (const rec of recs) {

					records.push(rec);

				}

				Object.assign(body, { 'page': { 'after': crs } });

				if (body!.hasOwnProperty('filter')) {

					delete body['filter']; // if set, filter already encoded in cursor.

				}
				if (body!.hasOwnProperty('sort')) {

					delete body['sort']; // if set, sort already encoded in cursor.

				}

				arrayLength = recs.length as number;

			} while (arrayLength !== 0);

		} catch (error) {

			throw new NodeApiError(this.getNode(), error);

		}


	} else {

		const limit = this.getNodeParameter('limit', 0) as number;

		try {

			Object.assign(body, { 'page': { 'size': limit } });
			const response = await xataApiRequest.call(this,apiKey,'POST',slug,database,branch,table,resource,body);
			records = response.records;

		} catch (error) {

			throw new NodeApiError(this.getNode(), error);

		}

	}

	return records;

}
