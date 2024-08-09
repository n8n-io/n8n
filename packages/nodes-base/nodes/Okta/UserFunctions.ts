import type {
	DeclarativeRestApiSettings,
	IDataObject,
	IExecuteFunctions,
	IExecutePaginationFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';

type OktaUser = {
	status: string;
	created: string;
	activated: string;
	lastLogin: string;
	lastUpdated: string;
	passwordChanged: string;
	profile: {
		login: string;
		email: string;
		firstName: string;
		lastName: string;
	};
	id: string;
};

export async function oktaApiRequest(
	this: IExecuteFunctions | IExecuteSingleFunctions | IHookFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject = {},
	qs: IDataObject = {},
	url?: string,
	option: IDataObject = {},
): Promise<OktaUser[]> {
	const credentials = await this.getCredentials('oktaApi');
	const baseUrl = `${credentials.url as string}/api/v1/${resource}`;
	const options: IHttpRequestOptions = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body: Object.keys(body).length ? body : undefined,
		qs: Object.keys(qs).length ? qs : undefined,
		url: url ?? baseUrl,
		json: true,
		...option,
	};
	return await (this.helpers.httpRequestWithAuthentication.call(
		this,
		'oktaApi',
		options,
	) as Promise<OktaUser[]>);
}

export async function getUsers(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const responseData: OktaUser[] = await oktaApiRequest.call(this, 'GET', '/users/');
	const filteredUsers = responseData.filter((user) => {
		if (!filter) return true;
		const username = `${user.profile.login}`.toLowerCase();
		return username.includes(filter.toLowerCase());
	});
	const users: INodePropertyOptions[] = filteredUsers.map((user) => ({
		name: `${user.profile.login}`,
		value: user.id,
	}));
	return {
		results: users,
	};
}

function simplifyOktaUser(item: OktaUser): IDataObject {
	return {
		id: item.id,
		status: item.status,
		created: item.created,
		activated: item.activated,
		lastLogin: item.lastLogin,
		lastUpdated: item.lastUpdated,
		passwordChanged: item.passwordChanged,
		profile: {
			firstName: item.profile.firstName,
			lastName: item.profile.lastName,
			login: item.profile.login,
			email: item.profile.email,
		},
	};
}

export async function simplifyGetAllResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (items.length === 0) return items;
	const simplify = this.getNodeParameter('simplify');
	if (!simplify)
		return ((items[0].json as unknown as IDataObject[]) ?? []).map((item: IDataObject) => ({
			json: item,
			headers: _response.headers,
		})) as INodeExecutionData[];
	let simplifiedItems: INodeExecutionData[] = [];
	if (items[0].json) {
		const jsonArray = items[0].json as unknown;
		simplifiedItems = (jsonArray as OktaUser[]).map((item: OktaUser) => {
			const simplifiedItem = simplifyOktaUser(item);
			return {
				json: simplifiedItem,
				headers: _response.headers,
			};
		});
	}

	return simplifiedItems;
}

export async function simplifyGetResponse(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	_response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	const simplify = this.getNodeParameter('simplify');
	if (!simplify) return items;
	const item = items[0].json as OktaUser;
	const simplifiedItem = simplifyOktaUser(item);

	return [
		{
			json: simplifiedItem,
		},
	] as INodeExecutionData[];
}

export const getCursorPaginator = () => {
	return async function cursorPagination(
		this: IExecutePaginationFunctions,
		requestOptions: DeclarativeRestApiSettings.ResultOptions,
	): Promise<INodeExecutionData[]> {
		if (!requestOptions.options.qs) {
			requestOptions.options.qs = {};
		}

		let items: INodeExecutionData[] = [];
		let responseData: INodeExecutionData[];
		let nextCursor: string | undefined = undefined;
		const returnAll = this.getNodeParameter('returnAll', true) as boolean;
		do {
			requestOptions.options.qs.limit = 200;
			requestOptions.options.qs.after = nextCursor;
			responseData = await this.makeRoutingRequest(requestOptions);
			if (responseData.length > 0) {
				const headers = responseData[responseData.length - 1].headers;
				const headersLink = (headers as IDataObject)?.link as string | undefined;
				nextCursor = headersLink?.split('after=')[1]?.split('&')[0]?.split('>')[0];
			}
			items = items.concat(responseData);
		} while (returnAll && nextCursor);

		return items;
	};
};
