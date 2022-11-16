import { OptionsWithUri } from 'request';
import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';
import {
	ICredentialTestFunctions,
	IDataObject,
	INodeListSearchItems,
	INodeListSearchResult,
	INodePropertyOptions,
	IPollFunctions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';
import moment from 'moment-timezone';
import jwt from 'jsonwebtoken';

export interface IGoogleAuthCredentials {
	delegatedEmail?: string;
	email: string;
	inpersonate: boolean;
	privateKey: string;
}

export async function apiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: string,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
) {
	const authenticationMethod = this.getNodeParameter(
		'authentication',
		0,
		'serviceAccount',
	) as string;
	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://sheets.googleapis.com${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		if (authenticationMethod === 'serviceAccount') {
			const credentials = await this.getCredentials('googleApi');

			const { access_token } = await getAccessToken.call(
				this,
				credentials as unknown as IGoogleAuthCredentials,
			);

			options.headers!.Authorization = `Bearer ${access_token}`;
			return await this.helpers.requestWithAuthentication.call(this, 'googleApi', options);
		} else {
			return await this.helpers.requestWithAuthentication.call(
				this,
				'googleSheetsOAuth2Api',
				options,
			);
		}
	} catch (error) {
		if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') {
			error.statusCode = '401';
		}

		if (error.message.includes('PERMISSION_DENIED')) {
			const message = 'Missing permissions for Google Sheet';
			const description =
				"Please check that the account you're using has the right permissions. (If you're trying to modify the sheet, you'll need edit access.)";
			throw new NodeApiError(this.getNode(), error, { message, description });
		}

		throw new NodeApiError(this.getNode(), error);
	}
}

export async function apiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: string,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
	uri: string,
) {
	const returnData: IDataObject[] = [];

	let responseData;
	query.maxResults = 100;
	const url = uri ? uri : `https://sheets.googleapis.com${method}`;
	do {
		responseData = await apiRequest.call(this, method, endpoint, body, query, url);
		query.pageToken = responseData['nextPageToken'];
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (responseData['nextPageToken'] !== undefined && responseData['nextPageToken'] !== '');

	return returnData;
}

export function getAccessToken(
	this:
		| IExecuteFunctions
		| IExecuteSingleFunctions
		| ILoadOptionsFunctions
		| ICredentialTestFunctions,
	credentials: IGoogleAuthCredentials,
): Promise<IDataObject> {
	//https://developers.google.com/identity/protocols/oauth2/service-account#httprest

	const scopes = [
		'https://www.googleapis.com/auth/drive.file',
		'https://www.googleapis.com/auth/spreadsheets',
		'https://www.googleapis.com/auth/drive.metadata',
	];

	const now = moment().unix();

	credentials.email = credentials.email.trim();
	const privateKey = (credentials.privateKey as string).replace(/\\n/g, '\n').trim();

	const signature = jwt.sign(
		{
			iss: credentials.email as string,
			sub: credentials.delegatedEmail || (credentials.email as string),
			scope: scopes.join(' '),
			aud: `https://oauth2.googleapis.com/token`,
			iat: now,
			exp: now + 3600,
		},
		privateKey,
		{
			algorithm: 'RS256',
			header: {
				kid: privateKey,
				typ: 'JWT',
				alg: 'RS256',
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
		uri: 'https://oauth2.googleapis.com/token',
		json: true,
	};

	return this.helpers.request!(options);
}

export async function spreadSheetsSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	try {
		const returnData: INodeListSearchItems[] = [];
		const query: string[] = [];
		if (filter) {
			query.push(`name contains '${filter.replace("'", "\\'")}'`);
		}
		query.push("mimeType = 'application/vnd.google-apps.spreadsheet'");
		const qs = {
			pageSize: 50,
			orderBy: 'modifiedTime desc',
			fields: 'nextPageToken, files(id, name, webViewLink)',
			q: query.join(' and '),
			includeItemsFromAllDrives: true,
			supportsAllDrives: true,
		};

		const sheets = await apiRequestAllItems.call(
			this,
			'files',
			'GET',
			'',
			{},
			qs,
			'https://www.googleapis.com/drive/v3/files',
		);
		for (const sheet of sheets) {
			returnData.push({
				name: sheet.name as string,
				value: sheet.id as string,
				url: sheet.webViewLink as string,
			});
		}
		return { results: sortLoadOptions(returnData) };
	} catch (error) {
		return { results: [] };
	}
}

export async function sheetsSearch(
	this: ILoadOptionsFunctions,
	_filter?: string,
): Promise<INodeListSearchResult> {
	try {
		const spreadsheetId = this.getNodeParameter('documentId', 0, {
			extractValue: true,
		}) as string;

		const query = {
			fields: 'sheets.properties',
		};

		const responseData = await apiRequest.call(
			this,
			'GET',
			`/v4/spreadsheets/${spreadsheetId}`,
			{},
			query,
		);

		if (responseData === undefined) {
			throw new NodeOperationError(this.getNode(), 'No data got returned');
		}

		const returnData: INodeListSearchItems[] = [];
		for (const sheet of responseData.sheets!) {
			if (sheet.properties!.sheetType !== 'GRID') {
				continue;
			}

			returnData.push({
				name: sheet.properties!.title as string,
				value: (sheet.properties!.sheetId as number) || 'gid=0',
				//prettier-ignore
				url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheet.properties!.sheetId}`,
			});
		}

		return { results: returnData };
	} catch (error) {
		return { results: [] };
	}
}

export async function spreadsheetGetSheetNameById(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
	spreadsheetId: string,
	sheetId: string,
) {
	const query = {
		fields: 'sheets.properties',
	};

	const response = await apiRequest.call(
		this,
		'GET',
		`/v4/spreadsheets/${spreadsheetId}`,
		{},
		query,
	);

	const foundItem = response.sheets.find(
		(item: { properties: { sheetId: number } }) => item.properties.sheetId === +sheetId,
	);
	if (!foundItem || !foundItem.properties || !foundItem.properties.title) {
		throw new Error(`Sheet with id ${sheetId} not found`);
	}
	return foundItem.properties.title;
}

export function sortLoadOptions(data: INodePropertyOptions[] | INodeListSearchItems[]) {
	const returnData = [...data];
	returnData.sort((a, b) => {
		const aName = (a.name as string).toLowerCase();
		const bName = (b.name as string).toLowerCase();
		if (aName < bName) {
			return -1;
		}
		if (aName > bName) {
			return 1;
		}
		return 0;
	});

	return returnData;
}
