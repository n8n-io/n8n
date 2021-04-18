import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IHookFunctions,
	NodeApiError,
} from 'n8n-workflow';

export async function kitemakerRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions | IHookFunctions,
	body: object = {},
) {
	const { personalAccessToken } = this.getCredentials('kitemakerApi') as { personalAccessToken: string };

	const options = {
		headers: {
			Authorization: `Bearer ${personalAccessToken}`,
		},
		method: 'POST',
		body,
		uri: 'https://toil.kitemaker.co/developers/graphql',
		json: true,
	};

	const responseData = await this.helpers.request!.call(this, options);

	if (responseData.errors) {
		throw new NodeApiError(this.getNode(), responseData);
	}

	return responseData;
}

export function createLoadOptions(
	resources: Array<{ name?: string; username?: string; title?: string; id: string }>,
): Array<{ name: string; value: string }> {
	return resources.map(option => {
		if (option.username) return ({ name: option.username, value: option.id });
		if (option.title) return ({ name: option.title, value: option.id });
		return ({ name: option.name ?? 'Unnamed', value: option.id });
	});
}
