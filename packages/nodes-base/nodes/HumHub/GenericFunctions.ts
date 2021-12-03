import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialTestFunctions,
	IDataObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export async function humhubApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string, resource: string, body: any = {}, qs: IDataObject = {}, uri?: string, encoding?: null | undefined): Promise<any> { // tslint:disable-line:no-any
	// const authenticationMethod = this.getNodeParameter('authentication', 0, 'serviceAccount') as string;

	// let authorization = '';
	// let url = '';
	// if (authenticationMethod === 'serviceAccount') {
		const credentials = await this.getCredentials('humhubApi');
		if (credentials === undefined) {
			throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
		}
		const auth = await getAccessToken.call(this, credentials as ICredentialDataDecryptedObject);

	// } else {
	//
	// }

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${auth.auth_token}`,
		},
		method,
		body,
		qs,
		uri: uri || `${credentials.url}/api/v1${resource}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	if (encoding === null) {
		options.encoding = null;
	}

	try {
		//@ts-ignore
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

export async function getAccessToken(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | ICredentialTestFunctions, credentials: ICredentialDataDecryptedObject): Promise<IDataObject> {

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method: 'POST',
		body: {
			username: credentials.username,
			password: credentials.password,
		},
		uri: `${credentials.url}/api/v1/auth/login`,
		json: true,
	};

	//@ts-ignore
	return await this.helpers.request(options);
}

export async function humhubApiRequestAllItems(this: IExecuteFunctions | ILoadOptionsFunctions, propertyName: string, method: string, endpoint: string, body: any = {}, query: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const returnData: IDataObject[] = [];

	let responseData;
	query.pageSize = 50;

	do {
		responseData = await humhubApiRequest.call(this, method, endpoint, body, query);
		query.pageToken = responseData['nextPageToken'];
		returnData.push.apply(returnData, responseData[propertyName]);
	} while (
		responseData['nextPageToken'] !== undefined &&
		responseData['nextPageToken'] !== ''
	);

	return returnData;
}

export function validateJSON(json: string | undefined): any { // tslint:disable-line:no-any
	let result;
	try {
		result = JSON.parse(json!);
	} catch (exception) {
		result = undefined;
	}
	return result;
}

export function getPagingParameters(resource: string, operation = 'getAll') {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			displayOptions: {
				show: {
					resource: [
						resource,
					],
					operation: [
						operation,
					],
				},
			},
			default: false,
			description: 'If all results should be returned or only up to a given limit.',
		},
		{
			displayName: 'Query Parameters',
			name: 'queryParameters',
			type: 'collection',
			placeholder: 'Add Field',
			default: {},
			displayOptions: {
				show: {
					resource: [
						resource,
					],
					operation: [
						operation,
					],
					returnAll: [
						false,
					],
				},
			},
			options: [
				{
					displayName: 'Limit',
					name: 'limit',
					type: 'number',
					typeOptions: {
						maxValue: 50,
						minValue: 1,
						numberStepSize: 1,
					},
					default: 20,
					description: 'The numbers of items to return per page. It can be 1 to 50, the default is 20.',
				},
				{
					displayName: 'Page',
					name: 'page',
					type: 'number',
					typeOptions: {
						minValue: 1,
						numberStepSize: 1,
					},
					default: 1,
					description: 'The number of page of the result set.',
				},
			],
		},
	];
}

export function getUserProfileFields(operation: string) {
	return [
		{
			displayName: 'Json Parameter Profile',
			name: 'jsonParameterProfile',
			type: 'boolean',
			displayOptions: {
				show: {
					resource: [
						'user',
					],
					operation: [
						operation,
					],
				},
			},
			default: false,
			description: 'If profile fields should be passed as JSON.',
		},
		{
			displayName: 'See <a href="https://www.humhub.com/en/marketplace/rest/docs/html/user.html#tag/User/paths/~1user/post" target="_blank">HumHub guide</a> to adding users',
			name: 'jsonNotice',
			type: 'notice',
			displayOptions: {
				show: {
					resource: [
						'user',
					],
					operation: [
						operation,
					],
					jsonParameterProfile: [
						true,
					],
				},
			},
			default: '',
		},
		{
			displayName: 'Profile (JSON)',
			name: 'profileJson',
			type: 'json',
			required: true,
			displayOptions: {
				show: {
					resource: [
						'user',
					],
					operation: [
						operation,
					],
					jsonParameterProfile: [
						true,
					],
				},
			},
			default: '',
			description: '',
		},
		{
			displayName: 'Profile',
			name: 'profileUi',
			type: 'collection',
			required: true,
			displayOptions: {
				show: {
					resource: [
						'user',
					],
					operation: [
						operation,
					],
					jsonParameterProfile: [
						false,
					],
				},
			},
			default: [],
			description: '',
			options: [
				{
					displayName: 'First Name',
					name: 'firstname',
					type: 'string',
					default: '',
					description: 'First name of the user.',
				},
				{
					displayName: 'Last Name',
					name: 'lastname',
					type: 'string',
					default: '',
					description: 'Last name of the user.',
				},
				{
					displayName: 'Title',
					name: 'title',
					type: 'string',
					default: '',
					description: 'Title of the user.',
				},
				{
					displayName: 'Gender',
					name: 'gender',
					type: 'string',
					default: '',
					description: 'Gender of the user.',
				},
				{
					displayName: 'Street',
					name: 'street',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'Zip',
					name: 'zip',
					type: 'number',
					default: '',
					description: '',
				},
				{
					displayName: 'City',
					name: 'city',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'Country',
					name: 'country',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'State',
					name: 'state',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'Birthday',
					name: 'birthday',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'About',
					name: 'about',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'Private Phone',
					name: 'phone_private',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'Work Phone',
					name: 'phone_work',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'Mobile',
					name: 'mobile',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'Fax',
					name: 'fax',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'Skype',
					name: 'im_skype',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'Xmpp',
					name: 'im_xmpp',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'URL',
					name: 'url',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'Facebook URL',
					name: 'url_facebook',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'Linkedin URL',
					name: 'url_linkedin',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'Xing URL',
					name: 'url_xing',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'YouTube URL',
					name: 'url_youtube',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'Vimeo URL',
					name: 'url_vimeo',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'Flickr URL',
					name: 'url_flickr',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'MySpace URL',
					name: 'url_myspace',
					type: 'string',
					default: '',
					description: '',
				},
				{
					displayName: 'Twitter URL',
					name: 'url_twitter',
					type: 'string',
					default: '',
					description: '',
				},
			],
		},
	];
}

export function convertBooleanToNumber(input: boolean) {
	let value: number|undefined;
	if (input === false ) {
		value = 0;
	} else if (input === true ) {
		value = 1;
	} else {
		value = undefined;
	}
	return value;
}