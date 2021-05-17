import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodePropertyOptions,
	NodeApiError,
} from 'n8n-workflow';

import * as moment from 'moment-timezone';

import * as jwt from 'jsonwebtoken';

import {
	LoggerProxy as Logger
} from 'n8n-workflow';

export async function salesforceApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const authenticationMethod = this.getNodeParameter('authentication', 0, 'oAuth2') as string;

	try {
		if (authenticationMethod === 'jwt') {
			// https://help.salesforce.com/articleView?id=remoteaccess_oauth_jwt_flow.htm&type=5
			const credentialsType = 'salesforceJwtApi';
			const credentials = await this.getCredentials(credentialsType);
			const response = await getAccessToken.call(this, credentials as IDataObject);
			const { instance_url, access_token } = response;
			const options = getOptions.call(this, method, (uri || endpoint), body, qs, instance_url as string);
			Logger.debug(`Authentication for "Salesforce" node is using "jwt". Invoking URI ${options.uri}`);
			options.headers!.Authorization = `Bearer ${access_token}`;
			//@ts-ignore
			return await this.helpers.request(options);
		} else {
			// https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm&type=5
			const credentialsType = 'salesforceOAuth2Api';
			const credentials = await this.getCredentials(credentialsType);
			const subdomain = ((credentials!.accessTokenUrl as string).match(/https:\/\/(.+).salesforce\.com/) || [])[1];
			const options = getOptions.call(this, method, (uri || endpoint), body, qs, `https://${subdomain}.salesforce.com`);
			Logger.debug(`Authentication for "Salesforce" node is using "OAuth2". Invoking URI ${options.uri}`);
			//@ts-ignore
			return await this.helpers.requestOAuth2.call(this, credentialsType, options);
		}
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function salesforceApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const returnData: IDataObject[] = [];

	let responseData;
	let uri: string | undefined;

	do {
		responseData = await salesforceApiRequest.call(this, method, endpoint, body, query, uri);
		uri = `${endpoint}/${responseData.nextRecordsUrl?.split('/')?.pop()}`;
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData.nextRecordsUrl !== undefined &&
		responseData.nextRecordsUrl !== null
	);

	return returnData;
}

/**
 * Sorts the given options alphabetically
 *
 * @export
 * @param {INodePropertyOptions[]} options
 * @returns {INodePropertyOptions[]}
 */
export function sortOptions(options: INodePropertyOptions[]): void {
	options.sort((a, b) => {
		if (a.name < b.name) { return -1; }
		if (a.name > b.name) { return 1; }
		return 0;
	});
}

function getOptions(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, endpoint: string, body: any, qs: IDataObject, instanceUrl: string): OptionsWithUri { // tslint:disable-line:no-any
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body: method === 'GET' ? undefined : body,
		qs,
		uri: `${instanceUrl}/services/data/v39.0${endpoint}`,
		json: true,
	};

	//@ts-ignore
	return options;
}

function getAccessToken(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, credentials: IDataObject): Promise<IDataObject> {
	const now = moment().unix();
	const authUrl = credentials.environment === 'sandbox' ? 'https://test.salesforce.com' : 'https://login.salesforce.com';

	const signature = jwt.sign(
		{
			'iss': credentials.clientId as string,
			'sub': credentials.username as string,
			'aud': authUrl,
			'exp': now + 3 * 60,
		},
		credentials.privateKey as string,
		{
			algorithm: 'RS256',
			header: {
				'alg': 'RS256',
			},
		},
	);

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		method: 'POST',
		form: {
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion: signature,
		},
		uri: `${authUrl}/services/oauth2/token`,
		json: true,
	};

	//@ts-ignore
	return this.helpers.request(options);
}

export function getConditions(options: IDataObject) {
	const conditions = (options.conditionsUi as IDataObject || {}).conditionValues as IDataObject[];
	let data = undefined;
	if (Array.isArray(conditions) && conditions.length !== 0) {
		data = conditions.map((condition: IDataObject) => `${condition.field}${(condition.operation) === 'equal' ? '=' : condition.operation}${getValue(condition.value)}`);
		data = `WHERE ${data.join(' AND ')}`;
	}
	return data;
}

export function getDefaultFields(sobject: string) {
	return (
		{
			'Account': 'id,name,type',
			'Lead': 'id,company,firstname,lastname,street,postalCode,city,email,status',
			'Contact': 'id,firstname,lastname,email',
			'Opportunity': 'id,accountId,amount,probability,type',
			'Case': 'id,accountId,contactId,priority,status,subject,type',
			'Task': 'id,subject,status,priority',
			'Attachment': 'id,name',
			'User': 'id,name,email',
		} as IDataObject
	)[sobject];
}

export function getQuery(options: IDataObject, sobject: string, returnAll: boolean, limit = 0) {
	const fields: string[] = [];
	if (options.fields) {
		// options.fields is comma separated in standard Salesforce objects and array in custom Salesforce objects -- handle both cases
		if (typeof options.fields === 'string') {
			fields.push.apply(fields, options.fields.split(','));
		} else {
			fields.push.apply(fields, options.fields as string[]);
		}
	} else {
		fields.push.apply(fields, (getDefaultFields(sobject) as string || 'id').split(','));
	}
	const conditions = getConditions(options);

	let query = `SELECT ${fields.join(',')} FROM ${sobject} ${(conditions ? conditions : '')}`;

	if (returnAll === false) {
		query = `SELECT ${fields.join(',')} FROM ${sobject} ${(conditions ? conditions : '')} LIMIT ${limit}`;
	}

	return query;
}

export function getValue(value: any) { // tslint:disable-line:no-any
	if (typeof value === 'string') {
		return `'${value}'`;
	} else {
		return value;
	}
}
