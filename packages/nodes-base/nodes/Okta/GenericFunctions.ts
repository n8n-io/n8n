import type {
	IDataObject,
	IExecuteFunctions,
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
		const fullName = `${user.profile.firstName} ${user.profile.lastName}`.toLowerCase();
		return fullName.includes(filter.toLowerCase());
	});
	const users: INodePropertyOptions[] = filteredUsers.map((user) => ({
		name: `${user.profile.firstName} ${user.profile.lastName}`,
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
		})) as INodeExecutionData[];
	let simplifiedItems: INodeExecutionData[] = [];
	if (items[0].json) {
		const jsonArray = items[0].json as unknown;
		simplifiedItems = (jsonArray as OktaUser[]).map((item: OktaUser) => {
			const simplifiedItem = simplifyOktaUser(item);
			return {
				json: simplifiedItem,
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
