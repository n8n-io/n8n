import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	INodeParameterResourceLocator,
	JsonObject,
	IRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { ApplicationError, NodeApiError, NodeOperationError } from 'n8n-workflow';

export async function twitterApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	fullOutput?: boolean,
	uri?: string,
	option: IDataObject = {},
) {
	let options: IRequestOptions = {
		method,
		body,
		qs,
		url: uri || `https://api.twitter.com/2${resource}`,
		json: true,
	};
	try {
		if (Object.keys(option).length !== 0) {
			options = Object.assign({}, options, option);
		}
		if (Object.keys(body).length === 0) {
			delete options.body;
		}
		if (Object.keys(qs).length === 0) {
			delete options.qs;
		}
		if (fullOutput) {
			return await this.helpers.requestOAuth2.call(this, 'twitterOAuth2Api', options);
		} else {
			const { data } = await this.helpers.requestOAuth2.call(this, 'twitterOAuth2Api', options);
			return data;
		}
	} catch (error) {
		if (error.error?.required_enrollment === 'Appropriate Level of API Access') {
			throw new NodeOperationError(
				this.getNode(),
				'The operation requires Twitter Api to be either Basic or Pro.',
			);
		} else if (error.errors && error.error?.errors[0].message.includes('must be ')) {
			throw new NodeOperationError(this.getNode(), error.error.errors[0].message as string);
		}
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function twitterApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	let responseData;

	query.max_results = 10;

	do {
		responseData = await twitterApiRequest.call(this, method, endpoint, body, query, true);
		query.next_token = responseData.meta.next_token as string;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.meta.next_token);

	return returnData;
}

export function returnId(tweetId: INodeParameterResourceLocator) {
	if (tweetId.mode === 'id') {
		return tweetId.value as string;
	} else if (tweetId.mode === 'url') {
		const value = tweetId.value as string;
		const tweetIdMatch = value.includes('lists')
			? value.match(/^https?:\/\/twitter\.com\/(?:#!\/)?(\w+)\/list(s)?\/(\d+)$/)
			: value.match(/^https?:\/\/twitter\.com\/(?:#!\/)?(\w+)\/status(es)?\/(\d+)$/);

		return tweetIdMatch?.[3] as string;
	} else {
		throw new ApplicationError(`The mode ${tweetId.mode} is not valid!`, { level: 'warning' });
	}
}

export async function returnIdFromUsername(
	this: IExecuteFunctions,
	usernameRlc: INodeParameterResourceLocator,
) {
	usernameRlc.value = (usernameRlc.value as string).includes('@')
		? (usernameRlc.value as string).replace('@', '')
		: usernameRlc.value;
	if (
		usernameRlc.mode === 'username' ||
		(usernameRlc.mode === 'name' && this.getNode().parameters.list !== undefined)
	) {
		const user = (await twitterApiRequest.call(
			this,
			'GET',
			`/users/by/username/${usernameRlc.value}`,
			{},
		)) as { id: string };
		return user.id;
	} else if (this.getNode().parameters.list === undefined) {
		const list = (await twitterApiRequest.call(
			this,
			'GET',
			`/list/by/name/${usernameRlc.value}`,
			{},
		)) as { id: string };
		return list.id;
	} else
		throw new ApplicationError(`The username mode ${usernameRlc.mode} is not valid!`, {
			level: 'warning',
		});
}
