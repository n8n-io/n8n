
import {
	OptionsWithUrl,
 } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
 } from 'n8n-workflow';

import * as qs from 'qs';
import { createHmac } from 'crypto';
import { queryResult } from 'pg-promise';
import * as moment from 'moment';

const unleashedHost = 'https://api.unleashedsoftware.com';

export async function unleashedApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, body: any = {}, path: string = '', qso: IDataObject = {} ,headers?: object): Promise<any> { // tslint:disable-line:no-any
	

	const options: OptionsWithUrl = {
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		qs: qso,
		body,
		url: `${unleashedHost}/${path}`,
        json: true,
        useQuerystring: false, //let's just explicitly indicate we will use qs for querystring stringification. 
	};


	if (Object.keys(body).length === 0) {
		delete options.body;
    }

	const credentials = this.getCredentials('unleashed');
    if (credentials === undefined) {
        throw new Error('No credentials got returned!');
	}

	const signature = createHmac('sha256', (credentials.apiKey as string))
		.update(qs.stringify(qso))
		.digest('base64');
    
    options.headers = Object.assign({}, headers, { 
        "api-auth-id": credentials.apiId,
        "api-auth-signature": signature,
    });

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.respose && error.response.body && error.response.body.detail) {
			throw new Error(`Unleashed Error response [${error.statusCode}]: ${error.response.body.detail}`);
		}
		throw error;
	}
}

export async function unleashedApiPaginatedRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, body: any = {}, path: string = '', qso: IDataObject = {} ,headers?: object): Promise<any> { // tslint:disable-line:no-any
	
	const returnData: IDataObject[] = [];
	let responseData;
	let pageNumber =  1;
	let pageSize = 1000; //max is 1000
	const qs = {...qso, pageSize}; //set page size to be consistent through all the requests

	do {
		responseData = await unleashedApiRequest.call(this, method, body, `${path}/${pageNumber}`, qs, headers);
		returnData.push.apply(returnData, responseData.Items);
		pageNumber = pageNumber + 1;
	} while (
		(responseData.Pagination.PageNumber as number) < (responseData.Pagination.NumberOfPages as number)
	);
	return returnData;
}



export function formatDateField<T, K extends keyof T>(obj: T, key: K): T {
	if (obj[key]) {
		return {
			...obj,
			[key]: moment(obj[key] as unknown as string).format('YYYY-MM-DD')
		}
	}
	return obj;
}

//.NET code is serializing dates in the following format: "/Date(1586833770780)/"
//which is useless on JS side and could not treated as a date for other nodes
//so we need to convert all of the fields that has it.
export function convertNETDates(item: {[key: string]: any}){
	Object.keys(item).forEach( path => {
		const type =  typeof item[path] as string;
		if (type === 'string') { 
			const value =  item[path] as string;
	    	const a = /\/Date\((\d*)\)\//.exec(value);
			if (a) { 
				item[path] = new Date(+a[1]) 
			}
		} if (type === 'object' && item[path]) {
			convertNETDates(item[path])
		}
	})
}

