import { IExecuteFunctions } from 'n8n-core';

export async function handleExecute(fns: IExecuteFunctions) {
	const credentials = await fns.getCredentials('foxyJwtApi');
	const foxySDK = require('@foxy.io/sdk');
	const foxyApi = new foxySDK.Backend.API(credentials);

	type Options = {
		method?: string;
		body?: string;
		headers?: object;
	};

	type Method = 'get' | 'post' | 'delete' | 'patch' | 'put';

	const options: Options = {};

	let url = fns.getNodeParameter('url', 0) as string;
	const method = fns.getNodeParameter('method', 0) as Method;
	const query = fns.getNodeParameter('query', 0, null) as string;
	const body = fns.getNodeParameter('body', 0, null) as string;

	options.method = method;

	if (query) {
		url += query;
	}

	if (body) {
		options.body = fns.getNodeParameter('body', 0) as string;
	}

	const foxyResponse = await foxyApi
		.fetch(url, options)
		.then((response: { json: () => any }) => {
			return response.json();
		})
		.then((data: any) => {
			return data;
		});

	return foxyResponse;
}
