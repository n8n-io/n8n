import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject, NodeApiError } from 'n8n-workflow';

const serviceJSONRPC = 'object';
const methodJSONRPC = 'execute';

export const mapOperationToJSONRPC = {
	create: 'create',
	get: 'read',
	getAll: 'search_read',
	update: 'write',
	delete: 'unlink',
};

export const mapFilterOperationToJSONRPC = {
	equal: '=',
	notEqual: '!=',
	greaterThen: '>',
	lesserThen: '<',
	greaterOrEqual: '>=',
	lesserOrEqual: '=<',
	like: 'like',
	in: 'in',
	notIn: 'not in',
	childOf: 'child_of',
};

type filterOperation =
	| 'equal'
	| 'notEqual'
	| 'greaterThen'
	| 'lesserThen'
	| 'greaterOrEqual'
	| 'lesserOrEqual'
	| 'like'
	| 'in'
	| 'notIn'
	| 'childOf';

type odooCRUD = 'create' | 'update' | 'delete' | 'get' | 'getAll';

function sanitizeInput(value: any, toNumber: boolean = false) {
	const result = (value as string)
		.replace(/ /g, '')
		.split(',')
		.filter((item) => item);
	if (toNumber) {
		return result.map((id) => +id);
	} else {
		return result;
	}
}

function processFilters(value: any) {
	return value.filter?.map((item: any) => {
		const operator = item.operator as filterOperation;
		item.operator = mapFilterOperationToJSONRPC[operator];
		return Object.values(item);
	});
}

function processFields(value: any) {
	return value?.fields.reduce((acc: any, record: any) => {
		return Object.assign(acc, { [record.fieldName]: record.fieldValue });
	}, {});
}


export async function odooJSONRPCRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	body: any = {},
	url: string,
): Promise<any> {
	try {
		let options: OptionsWithUri = {
			headers: {
				'User-Agent': 'https://n8n.io',
				Connection: 'keep-alive',
				Accept: '*/*',
				'Accept-Encoding': 'gzip, deflate, br',
				'Content-Type': 'application/json',
			},
			method: 'POST',
			body,
			uri: `${url}/jsonrpc`,
			json: true,
		};

		const result = await this.helpers.request!(options);
		if (result.error) {
			throw new NodeApiError(this.getNode(), result.error.data, {
				message: result.error.data.message,
			});
		}
		return result;
	} catch (error: any) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function odooCreate(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	operation: odooCRUD,
	url: string,
	newItem: any,
): Promise<any> {
	try {
		const body = {
			jsonrpc: '2.0',
			method: 'call',
			params: {
				service: serviceJSONRPC,
				method: methodJSONRPC,
				args: [
					db,
					userID,
					password,
					resource,
					mapOperationToJSONRPC[operation],
					[JSON.parse(newItem)],
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		const result = await odooJSONRPCRequest.call(this, body, url);
		return result;
	} catch (error: any) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function odooGet(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	operation: odooCRUD,
	url: string,
	itemsID: any,
	fieldsToReturn: any,
): Promise<any> {
	try {
		const body = {
			jsonrpc: '2.0',
			method: 'call',
			params: {
				service: serviceJSONRPC,
				method: methodJSONRPC,
				args: [
					db,
					userID,
					password,
					resource,
					mapOperationToJSONRPC[operation],
					sanitizeInput(itemsID, true) || [],
					sanitizeInput(fieldsToReturn) || [],
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		const result = await odooJSONRPCRequest.call(this, body, url);
		return result;
	} catch (error: any) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function odooGetAll(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	operation: odooCRUD,
	url: string,
	filters: any,
	fieldsToReturn: any,
): Promise<any> {
	try {
		const body = {
			jsonrpc: '2.0',
			method: 'call',
			params: {
				service: serviceJSONRPC,
				method: methodJSONRPC,
				args: [
					db,
					userID,
					password,
					resource,
					mapOperationToJSONRPC[operation],
					processFilters(filters) || [],
					sanitizeInput(fieldsToReturn) || [],
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		const result = await odooJSONRPCRequest.call(this, body, url);
		return result;
	} catch (error: any) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function odooUpdate(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	operation: odooCRUD,
	url: string,
	itemsID: any,
	fieldsToUpdate: any,
): Promise<any> {
	try {
		const body = {
			jsonrpc: '2.0',
			method: 'call',
			params: {
				service: serviceJSONRPC,
				method: methodJSONRPC,
				args: [
					db,
					userID,
					password,
					resource,
					mapOperationToJSONRPC[operation],
					sanitizeInput(itemsID, true) || [],
					processFields(fieldsToUpdate) || [],
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		const result = await odooJSONRPCRequest.call(this, body, url);
		return result;
	} catch (error: any) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function odooDelete(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	operation: odooCRUD,
	url: string,
	itemsID: any,
): Promise<any> {
	try {
		const body = {
			jsonrpc: '2.0',
			method: 'call',
			params: {
				service: serviceJSONRPC,
				method: methodJSONRPC,
				args: [
					db,
					userID,
					password,
					resource,
					mapOperationToJSONRPC[operation],
					sanitizeInput(itemsID, true) || [],
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		const result = await odooJSONRPCRequest.call(this, body, url);
		return result;
	} catch (error: any) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function odooGetUserID(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	username: string,
	password: string,
	url: string,
): Promise<number> {
	try {
		const body = {
			jsonrpc: '2.0',
			method: 'call',
			params: {
				service: 'common',
				method: 'login',
				args: [db, username, password],
			},
			id: Math.floor(Math.random() * 100),
		};
		const loginResult = await odooJSONRPCRequest.call(this, body, url);
		return loginResult?.result;
	} catch (error: any) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function odooGetServerVersion(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	url: string,
): Promise<number> {
	try {
		const body = {
			jsonrpc: '2.0',
			method: 'call',
			params: {
				service: 'common',
				method: 'version',
				args: [],
			},
			id: Math.floor(Math.random() * 100),
		};
		const result = await odooJSONRPCRequest.call(this, body, url);
		return result;
	} catch (error: any) {
		throw new NodeApiError(this.getNode(), error);
	}
}
