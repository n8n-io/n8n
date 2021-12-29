import { OptionsWithUri } from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import { IDataObject, JsonObject, NodeApiError } from 'n8n-workflow';

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

type FilterOperation =
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

interface IOdooResponce {
	jsonrpc: string;
	id: number;
	result?: IDataObject | IDataObject[];
	error?: IDataObject | IDataObject[];
}
export interface IOdooFilterOperations {
	filter: Array<{
		fieldName: string;
		operator: string;
		value: string;
	}>;
}

export interface IOdooNameValueFields {
	fields: Array<{
		fieldName: string;
		fieldValue: string;
	}>;
}

export interface IOdooResponceFields {
	fields: Array<{
		field: string;
		fromList?: boolean;
	}>;
}

type OdooCRUD = 'create' | 'update' | 'delete' | 'get' | 'getAll';

function sanitizeInput(value: string, toNumber = false) {
	const result = value
		.replace(/ /g, '')
		.split(',')
		.filter((item) => item);
	if (toNumber) {
		return result.map((id) => +id);
	} else {
		return result;
	}
}

function processFilters(value: IOdooFilterOperations) {
	return value.filter?.map((item) => {
		const operator = item.operator as FilterOperation;
		item.operator = mapFilterOperationToJSONRPC[operator];
		return Object.values(item);
	});
}

function processNameValueFields(value: IDataObject) {
	const data = value as unknown as IOdooNameValueFields;
	return data?.fields?.reduce((acc, record) => {
		return Object.assign(acc, { [record.fieldName]: record.fieldValue });
	}, {});
}

function processResponceFields(value: IDataObject) {
	const data = value as unknown as IOdooResponceFields;
	return data?.fields?.map((entry) => entry.field);
}

export async function odooJSONRPCRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	body: IDataObject,
	url: string,
): Promise<IDataObject | IDataObject[]> {
	try {
		const options: OptionsWithUri = {
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

		const responce = await this.helpers.request!(options);
		if (responce.error) {
			throw new NodeApiError(this.getNode(), responce.error.data, {
				message: responce.error.data.message,
			});
		}
		return responce.result;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function odooGetModelFields(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	url: string,
) {
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
					'fields_get',
					[],
					['string', 'type', 'help', 'required', 'name'],
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		const result = await odooJSONRPCRequest.call(this, body, url);
		return result;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function odooCreate(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	operation: OdooCRUD,
	url: string,
	newItem: IDataObject,
) {
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
					processNameValueFields(newItem) || {},
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		const result = await odooJSONRPCRequest.call(this, body, url);
		return { id: result };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function odooGet(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	operation: OdooCRUD,
	url: string,
	itemsID: string,
	fieldsToReturn: IDataObject,
) {
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
					processResponceFields(fieldsToReturn) || [],
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		const result = await odooJSONRPCRequest.call(this, body, url);
		return result;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function odooGetAll(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	operation: OdooCRUD,
	url: string,
	filters: IOdooFilterOperations,
	fieldsToReturn: IDataObject,
) {
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
					processResponceFields(fieldsToReturn) || [],
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		const result = await odooJSONRPCRequest.call(this, body, url);
		return result;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function odooUpdate(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	operation: OdooCRUD,
	url: string,
	itemsID: string,
	fieldsToUpdate: IDataObject,
) {
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
					processNameValueFields(fieldsToUpdate) || {},
				],
			},
			id: Math.floor(Math.random() * 100),
		};

		const result = await odooJSONRPCRequest.call(this, body, url);
		return { success: result };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function odooDelete(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	db: string,
	userID: number,
	password: string,
	resource: string,
	operation: OdooCRUD,
	url: string,
	itemsID: string,
) {
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
		return { success: result };
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
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
		return loginResult as unknown as number;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function odooGetServerVersion(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions,
	url: string,
) {
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
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
