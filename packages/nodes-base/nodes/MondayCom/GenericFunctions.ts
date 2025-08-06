import get from 'lodash/get';
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHookFunctions,
	IWebhookFunctions,
	JsonObject,
	IRequestOptions,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function mondayComApiRequest(
	this: IExecuteFunctions | IWebhookFunctions | IHookFunctions | ILoadOptionsFunctions,
	body: any = {},
	option: IDataObject = {},
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('authentication', 0) as string;

	let options: IRequestOptions = {
		headers: {
			'API-Version': '2023-10',
			'Content-Type': 'application/json',
		},
		method: 'POST',
		body,
		uri: 'https://api.monday.com/v2/',
		json: true,
	};

	options = Object.assign({}, options, option);

	try {
		let credentialType = 'mondayComApi';

		if (authenticationMethod === 'oAuth2') {
			credentialType = 'mondayComOAuth2Api';
		}
		return await this.helpers.requestWithAuthentication.call(this, credentialType, options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function mondayComApiRequestAllItems(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	body: any = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	body.variables.limit = 50;
	body.variables.page = 1;

	do {
		responseData = await mondayComApiRequest.call(this, body);
		returnData.push.apply(returnData, get(responseData, propertyName) as IDataObject[]);
		body.variables.page++;
	} while (get(responseData, propertyName).length > 0);
	return returnData;
}

export async function mondayComApiPaginatedRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	itemsPath: string,
	fieldsToReturn: string,
	body: IDataObject = {},
) {
	const returnData: IDataObject[] = [];

	const initialResponse = await mondayComApiRequest.call(this, body);
	const data = get(initialResponse, itemsPath) as IDataObject;

	if (data) {
		returnData.push.apply(returnData, data.items as IDataObject[]);

		let cursor: null | string = data.cursor as string;

		while (cursor) {
			const responseData = (
				(await mondayComApiRequest.call(this, {
					query: `query ( $cursor: String!) { next_items_page (cursor: $cursor, limit: 100) { cursor items ${fieldsToReturn} } }`,
					variables: {
						cursor,
					},
				})) as IDataObject
			).data as { next_items_page: { cursor: string; items: IDataObject[] } };

			if (responseData && responseData.next_items_page) {
				returnData.push.apply(returnData, responseData.next_items_page.items);
				cursor = responseData.next_items_page.cursor;
			} else {
				cursor = null;
			}
		}
	}

	return returnData;
}
