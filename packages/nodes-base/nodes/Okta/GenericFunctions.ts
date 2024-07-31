import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';

type OktaUser = {
	profile: {
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
