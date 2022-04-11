import {
	IExecuteFunctions
} from 'n8n-core';


import {
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	NodeApiError,
} from 'n8n-workflow';

export function getItem(this: IExecuteFunctions, index: number, item: IDataObject, location: string) {

	const sendAll = this.getNodeParameter('sendAll', index) as boolean;

	if (!sendAll) {

		const additionalOptions = getAdditionalOptions(this.getNodeParameter('additionalOptions', index) as IDataObject);
		const columns = additionalOptions['columns'] ? additionalOptions['columns'] as string[] : [];
		const ignoreColumns = additionalOptions['ignoreColumns'] ? additionalOptions['ignoreColumns'] as string[] : [];

		if (columns.length !== 0 && ignoreColumns.length !== 0) {

			throw new Error('You cannot have the Columns and Ignore Columns properties set at the same time');

		}

		if (columns.length === 0 && ignoreColumns.length === 0) {

			throw new Error('You do not have any additional option set. If you want to send all column values to Xata set the Send All properties to true');

		}

		const ignore = columns.length === 0 ? true : false as boolean;
		const filterColumns = ignore ? ignoreColumns : columns as string[];
		const returnData = filterItemsColumns(item, filterColumns, ignore, location);
		return returnData;

	} else {

		return item;

	}

}

export function filterItemsColumns(item: IDataObject, filterColumns: string[], ignore: boolean, location: string) {

	//const columnsData = columnsRequest.columns as IDataObject[];
	//const columns = columnsData.map(el=>el['name']) as string[];
	const returnData = ignore ? item : {} as IDataObject;

	for (const key of filterColumns) {

		returnData[key] = item[key];

		if (ignore && returnData.hasOwnProperty(key)) {

			delete returnData[key];

		}

	}

	return returnData;

}

export function getAdditionalOptions(additionalOptions: IDataObject) {

	const body = {} as IDataObject;

	for (const key in additionalOptions) {

		if (key === 'columns' && additionalOptions[key]) {

			body[key] = (additionalOptions[key] as string[]).map(el=>el.trim());

		} else if ((key === 'filter' || key === 'sort') && additionalOptions[key]) {

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

export async function xataApiRequest(this: IExecuteFunctions, apiKey: string, method: IHttpRequestMethods, slug: string, database: string, branch: string, table: string, resource: string, body: IDataObject, option: IDataObject = {}, url?: string): Promise<any> { // tslint:disable-line:no-any

	try {


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

		const res = await this.helpers.httpRequest(options);
		return res;


	} catch (error) {

		throw new NodeApiError(this.getNode(), error);
	}

}

export async function xataApiFetchAllWrapper(this: IExecuteFunctions, apiKey: string, method: IHttpRequestMethods, slug: string, database: string, branch: string, table: string, resource: string, body: IDataObject, returnAll: boolean, limit: any, url?: string): Promise<any> { // tslint:disable-line:no-any

	try {

		const options: IHttpRequestOptions = {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			method,
			body,
			url: url || `https://${slug}.xata.sh/db/${database}:${branch}/tables/${table}/${resource}`,
			json: true,

		};

		const results = new Array();

		if (returnAll) {

			await xataApiFetchAll.call(this, options, results);

		} else {

			const response = await this.helpers.httpRequest(options);
			const records = response.records;
			let numRecords = 0;

			for (const item of records) {

				results.push(item);
				numRecords++;

				if (numRecords === limit) {

					return results;

				}

			}

		}

		return results;

	} catch (error) {

		throw new NodeApiError(this.getNode(), error);

	}

}

export async function xataApiFetchAll(this: IExecuteFunctions, options: IHttpRequestOptions, results: IDataObject[], cursor?: string): Promise<any> { // tslint:disable-line:no-any

	if (cursor) {

		Object.assign(options['body'], { 'page': { 'after': cursor } });

		if (options['body']!.hasOwnProperty('filter')) {

			delete (options['body'] as IDataObject)['filter']; // if set, filter already encoded in cursor.

		}

	}

	const res = await this.helpers.httpRequest(options);
	const records = res.records;

	if (!records || records.length === 0) {

		return;

	}

	for (const item of records) {

		results.push(item);

	}

	const crs = res.meta.page.cursor as string;
	await xataApiFetchAll.call(this, options, results, crs);

}
