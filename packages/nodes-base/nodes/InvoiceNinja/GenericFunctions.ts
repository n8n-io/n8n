import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	JsonObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	get,
} from 'lodash';

export const eventID: {[key: string]: string} = {
	create_client: '1',
	create_invoice: '2',
	create_quote: '3',
	create_payment: '4',
	create_vendor: '5',
};

export async function invoiceNinjaApiRequest(this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, query?: IDataObject, uri?: string): Promise<any> { // tslint:disable-line:no-any
	const credentials = await this.getCredentials('invoiceNinjaApi');

	if (credentials === undefined) {
		throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
	}
	const version = credentials.version;
	const defaultUrl = version === 'v4' ? 'https://app.invoiceninja.com' : 'https://invoicing.co';
	const baseUrl = credentials!.url || defaultUrl;

	let headers;
	if (version === 'v4') {
		headers = {
			Accept: 'application/json',
			'X-Ninja-Token': credentials.apiToken,
		};
	} else {
		headers = {
			'Content-Type': 'application/json',
			'X-API-TOKEN': credentials.apiToken,
			'X-Requested-With': 'XMLHttpRequest',
			'X-API-SECRET': credentials.secret || '',
		};
	}

	const options: OptionsWithUri = {
		headers,
		method,
		qs: query,
		uri: uri || `${baseUrl}/api/v1${endpoint}`,
		body,
		json: true,
	};

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), (error as JsonObject));
	}
}

export async function invoiceNinjaApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	let uri;
	query.per_page = 100;

	do {
		responseData = await invoiceNinjaApiRequest.call(this, method, endpoint, body, query, uri);
		const next = get(responseData, 'meta.pagination.links.next') as string | undefined;
		if (next) {
			uri = next;
		}
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData.meta !== undefined &&
		responseData.meta.pagination &&
		responseData.meta.pagination.links &&
		responseData.meta.pagination.links.next
	);

	return returnData;
}

export async function testInvoiceNinjaAuth(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<INodeCredentialTestResult> {
	const credentials = credential.data;
	const version = credentials?.version as string;
	const defaultUrl = version === 'v4' ? 'https://app.invoiceninja.com' : 'https://invoicing.co';
	const baseUrl = credentials!.url || defaultUrl;

	let headers;
	if (version === 'v4') {
		headers = {
			Accept: 'application/json',
			'X-Ninja-Token': credentials?.apiToken as string,
		};
	} else {
		headers = {
			'Content-Type': 'application/json',
			'X-API-TOKEN': credentials?.apiToken as string,
			'X-Requested-With': 'XMLHttpRequest',
			'X-API-SECRET': credentials?.secret as string || '',
		};
	}

	const options: OptionsWithUri = {
		headers,
		method: 'GET',
		uri:`${baseUrl}/api/v1/clients`,
	};

	try {
		const response = await this.helpers.request(options);
	} catch (err) {
		return {
			status: 'Error',
			message: `${(err as JsonObject).message}`,
		};
	}

	return {
		status: 'OK',
		message: 'Connection successful!',
	};
}
