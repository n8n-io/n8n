import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	JsonObject,
	IHttpRequestMethods,
	IRequestOptions,
	INodeListSearchResult,
	INodeListSearchItems,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function googleApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,

	body: any = {},
	qs: IDataObject = {},
	uri?: string,
	headers: IDataObject = {},
): Promise<any> {
	const options: IRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://www.googleapis.com/admin${resource}`,
		json: true,
	};
	try {
		if (Object.keys(headers).length !== 0) {
			options.headers = Object.assign({}, options.headers, headers);
		}
		if (Object.keys(body as IDataObject).length === 0) {
			delete options.body;
		}
		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'gSuiteAdminOAuth2Api', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function googleApiRequestAllItems(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	propertyName: string,
	method: IHttpRequestMethods,
	endpoint: string,

	body: any = {},
	query: IDataObject = {},
): Promise<any> {
	const returnData: IDataObject[] = [];

	let responseData;
	query.maxResults = 100;

	do {
		responseData = await googleApiRequest.call(this, method, endpoint, body, query);
		query.pageToken = responseData.nextPageToken;
		returnData.push.apply(returnData, responseData[propertyName] as IDataObject[]);
	} while (responseData.nextPageToken !== undefined && responseData.nextPageToken !== '');

	return returnData;
}

/* listSearch methods */
export async function searchUsers(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const qs: IDataObject = {
		customer: 'my_customer',
	};

	// Perform the API request to list all users
	const responseData = await googleApiRequestAllItems.call(
		this,
		'users',
		'GET',
		'/directory/v1/users',
		{},
		qs,
	);

	// Handle cases where no users are found
	if (!responseData || responseData.length === 0) {
		console.warn('No users found in the response');
		return { results: [] };
	}

	//Map the API response
	const results: INodeListSearchItems[] = responseData.map(
		(user: { name?: { fullName?: string }; primaryEmail?: string; id?: string }) => ({
			name: user.name?.fullName || user.primaryEmail || 'Unnamed User',
			value: user.id || user.primaryEmail,
		}),
	);

	return { results };
}

export async function searchGroups(this: ILoadOptionsFunctions): Promise<INodeListSearchResult> {
	const qs: IDataObject = {
		customer: 'my_customer',
	};

	// Perform the API request to list all groups
	const responseData = await googleApiRequestAllItems.call(
		this,
		'groups',
		'GET',
		'/directory/v1/groups',
		{},
		qs,
	);

	// Handle cases where no groups are found
	if (!responseData || responseData.length === 0) {
		console.warn('No groups found in the response');
		return { results: [] };
	}

	//Map the API response
	const results: INodeListSearchItems[] = responseData.map(
		(group: { name?: string; email?: string; id?: string }) => ({
			name: group.name || group.email || 'Unnamed Group',
			value: group.id || group.email,
		}),
	);

	return { results };
}
