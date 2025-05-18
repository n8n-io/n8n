import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, randomInt } from 'n8n-workflow';

export const mapFilterOperationToJSONRPC = {
	notEqual: '!=',
	lesserThan: '<',
	lesserOrEqualThan: '<=',
	equal: '=',
	unsetOrEqual: '=?',
	equalIlike: '=ilike',
	equalLike: '=like',
	greaterThan: '>',
	greaterOrEqualThan: '>=',
	any: 'any',
	childOf: 'child_of',
	ilike: 'ilike',
	in: 'in',
	like: 'like',
	notAny: 'not any',
	notIlike: 'not ilike',
	notIn: 'not in',
	notLike: 'not like',
	parentOf: 'parent_of',
};

type FilterOperation =
	| 'notEqual'
	| 'lesserThan'
	| 'lesserOrEqualThan'
	| 'equal'
	| 'unsetOrEqual'
	| 'equalIlike'
	| 'equalLike'
	| 'greaterThan'
	| 'greaterOrEqualThan'
	| 'any'
	| 'childOf'
	| 'ilike'
	| 'in'
	| 'like'
	| 'notAny'
	| 'notIlike'
	| 'notIn'
	| 'notLike'
	| 'parentOf';

export interface IOdooFilterOperations {
	searchDomain: Array<{
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

export type OdooCRUD = 'create' | 'update' | 'delete' | 'get' | 'getAll' | 'executeMethod';

export interface OdooCredentialsInterface {
	url: string;
	db: string;
	userID: number;
	password: string;
}

type OdooFunctionContext = IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions;

export async function odooJSONRPCRequest(
	this: OdooFunctionContext,
	body: IDataObject,
	url: string,
): Promise<IDataObject | IDataObject[]> {
	try {
		const options: IHttpRequestOptions = {
			headers: {
				'User-Agent': 'n8n',
				Connection: 'keep-alive',
				Accept: '*/*',
				'Content-Type': 'application/json',
			},
			method: 'POST',
			body,
			url: `${url}/jsonrpc`,
			json: true,
		};

		const response = await this.helpers.httpRequest(options);
		if (response.error) {
			throw new NodeApiError(this.getNode(), response.error.data as JsonObject, {
				message: response.error.data.message,
			});
		}
		return response.result;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function odooLoginRequest(
	this: OdooFunctionContext,
	credentials: ICredentialDataDecryptedObject,
): Promise<number> {
	try {
		const body = {
			jsonrpc: '2.0',
			method: 'call',
			params: {
				service: 'common',
				method: 'login',
				args: [credentials.db, credentials.username, credentials.password],
			},
			id: randomInt(100),
		};
		const loginResult = await odooJSONRPCRequest.call(this, body, credentials.url as string);
		return loginResult as unknown as number;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export function odooGetDBName(databaseName: string | undefined, url: string) {
	if (databaseName) return databaseName;
	const odooURL = new URL(url);
	const hostname = odooURL.hostname;
	if (!hostname) return '';
	return odooURL.hostname.split('.')[0];
}

export async function odooGetRequestCredentials(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
) {
	const credentials = await this.getCredentials('odooApi');
	const url = (credentials.url as string).replace(/\/$/, '');
	const db = odooGetDBName(credentials.db as string, url);
	const userID = await odooLoginRequest.call(this, credentials);
	const password = credentials.password as string;
	return { url, db, userID, password } as OdooCredentialsInterface;
}

function odooBuildRequestBody(
	credentials: OdooCredentialsInterface,
	resource: string,
	method: string,
	args: any[],
	kwargs?: object,
) {
	const requestBody: any = {
		jsonrpc: '2.0',
		method: 'call',
		params: {
			service: 'object',
			method: 'execute_kw',
			args: [credentials.db, credentials.userID, credentials.password, resource, method, args],
		},
		id: randomInt(100),
	};

	if (kwargs) {
		requestBody.params.args.push(kwargs);
	}

	return requestBody;
}

export async function odooHTTPRequest(
	this: OdooFunctionContext,
	credentials: OdooCredentialsInterface,
	resource: string,
	method: string,
	args: any[],
	kwargs?: object,
) {
	try {
		const body = odooBuildRequestBody(credentials, resource, method, args, kwargs);
		const response = await odooJSONRPCRequest.call(this, body, credentials.url);
		return response;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

function autoConvertValue(value: any): any {
	if (typeof value !== 'string') return value;

	const lower = value.toLowerCase();

	// Handle booleans manually
	if (lower === 'true') return true;
	if (lower === 'false') return false;

	// Attempt JSON parse (for arrays, numbers, etc.)
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

export function processBasicFilters(value: IOdooFilterOperations) {
	return value.searchDomain?.map((item) => {
		const operator = item.operator as FilterOperation;
		const jsonRpcOperator = mapFilterOperationToJSONRPC[operator];

		const convertedValue = autoConvertValue(item.value);

		return [item.fieldName, jsonRpcOperator, convertedValue];
	});
}

export function processCustomFilters(value: string) {
	const cleanedValue = value
		.replace(/\n/g, '')
		.replace(/\s+/g, ' ')
		.replace(/\bTrue\b/g, 'true')
		.replace(/\bFalse\b/g, 'false')
		.replace(/\bNone\b/g, 'null')
		.replace(/'/g, '"')
		.replace(/\(([^()]+?)\)/g, '[$1]') // convert tuples to arrays
		.trim();
	try {
		return JSON.parse(cleanedValue);
	} catch (error) {
		throw new ApplicationError();
	}
}

export function processNameValueFields(value: IDataObject) {
	const data = value as unknown as IOdooNameValueFields;
	return data?.fields?.reduce((acc, record) => {
		return Object.assign(acc, { [record.fieldName]: record.fieldValue });
	}, {});
}
