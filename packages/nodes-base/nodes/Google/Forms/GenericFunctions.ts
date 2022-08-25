import { OptionsWithUri } from 'request';

import { IExecuteFunctions, IExecuteSingleFunctions, ILoadOptionsFunctions } from 'n8n-core';

import { IDataObject, IPollFunctions, NodeApiError, NodeOperationError } from 'n8n-workflow';

import moment from 'moment-timezone';

import jwt from 'jsonwebtoken';

interface IGoogleAuthCredentials {
	delegatedEmail?: string;
	email: string;
	inpersonate: boolean;
	privateKey: string;
}

export async function googleApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: string,
	resource: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	option: IDataObject = {},
	// tslint:disable-next-line:no-any
): Promise<any> {
	const authenticationMethod = this.getNodeParameter(
		'authentication',
		0,
		'serviceAccount',
	) as string;

	let options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: `${uri || 'https://forms.googleapis.com'}${resource}`,
		json: true,
	};

	options = Object.assign({}, options, option);
	try {
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
			return await this.helpers.request!(options);
		} else {
			//@ts-ignore
			return await this.helpers.requestOAuth2.call(this, 'googleFormsOAuth2Api', options);
		}
	} catch (error) {
		if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') {
			error.statusCode = '401';
		}

		throw new NodeApiError(this.getNode(), error);
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
	propertyName: string,
	method: string,
	endpoint: string,
	// tslint:disable-next-line:no-any
	body: any = {},
	query: IDataObject = {},
	uri?: string,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.pageSize = query.pageSize || 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query, uri);
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (responseData['nextPageToken'] !== undefined && responseData['nextPageToken'] !== '');

	return returnData;
}

function getAccessToken(
	this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
	credentials: IGoogleAuthCredentials,
): Promise<IDataObject> {
	//https://developers.google.com/identity/protocols/oauth2/service-account#httprest

	const scopes = [
		"https://www.googleapis.com/auth/forms.body.readonly",
		"https://www.googleapis.com/auth/drive.file",
		"https://www.googleapis.com/auth/drive",
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
		privateKey as string,
		{
			algorithm: 'RS256',
			header: {
				kid: privateKey as string,
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
