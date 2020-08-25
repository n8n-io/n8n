import { OptionsWithUri} from 'request';
import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IExecuteSingleFunctions
} from 'n8n-core';
import {
	IDataObject,
} from 'n8n-workflow';

export async function theHiveApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, query: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('theHiveApi');
	
	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}
	
	const headerWithAuthentication = Object.assign({},
		{ Authorization: ` Bearer ${credentials.ApiKey}`,
		  'Content-Type': Object.keys(option).length ===  0? undefined:'multipart/form-data'});
	let options: OptionsWithUri = {
		headers: headerWithAuthentication,
		method,
		qs: query,
		uri: uri || `${credentials.host}/api/${resource}`,
		body,
		json: true,	
	};
	if (Object.keys(option).length !== 0) {
		options = Object.assign({},options, option);
	}
	if (Object.keys(body).length ===  0) {
		delete options.body;
	}
	if (Object.keys(query).length ===  0) {
		delete options.qs;
	}
	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if (error.error ) {
			const errorMessage = `TheHive error response [${error.statusCode}]: ${error.error.message || error.error.type}`;
			throw new Error(errorMessage);
		} else throw error;
	}
}


export async function getAll<T>(this: IExecuteSingleFunctions | IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions,resource:string,body:IDataObject,query:IDataObject): Promise<T[]> { // tslint:disable-line:no-any
    let responseData:T[] = await theHiveApiRequest.call(this, 'GET', resource, body, query, undefined, {});
	return responseData;
}

export async function getOneById<T>(this: IExecuteSingleFunctions | IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions,resource:string,body:IDataObject,query:IDataObject): Promise<T> { // tslint:disable-line:no-any
    let responseData:T = await theHiveApiRequest.call(this, 'GET', resource, body, query, undefined, {});
	return responseData;
}
export async function create<T>(this: IExecuteSingleFunctions | IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions,resource:string,body:IDataObject,query:IDataObject): Promise<T> { // tslint:disable-line:no-any
    let responseData:T = await theHiveApiRequest.call(this, 'POST', resource, body, query, undefined, {});
	return responseData;
}
export async function update<T>(this: IExecuteSingleFunctions | IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions,resource:string,body:IDataObject,query:IDataObject): Promise<T> { // tslint:disable-line:no-any
    let responseData:T = await theHiveApiRequest.call(this, 'PATCH', resource, body, query, undefined, {});
	return responseData;
}
export async function search<T>(this: IExecuteSingleFunctions | IHookFunctions | IExecuteFunctions| ILoadOptionsFunctions,resource:string,body:IDataObject,query:IDataObject): Promise<T[]> { // tslint:disable-line:no-any
    let responseData:T[] = await theHiveApiRequest.call(this, 'POST', `${resource}/_search`, body, query, undefined, {});
	return responseData;
}

      
