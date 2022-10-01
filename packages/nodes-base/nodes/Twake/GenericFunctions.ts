import { IExecuteFunctions, IHookFunctions, ILoadOptionsFunctions } from 'n8n-core';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { OptionsWithUri } from 'request';

/**
 * Make an API request to Twake
 *
 */
export async function twakeApiRequest(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	method: string,
	resource: string,
	body: object,
	query?: object,
	uri?: string,
	// tslint:disable-next-line:no-any
): Promise<any> {
	const authenticationMethod = this.getNodeParameter('twakeVersion', 0, 'twakeCloudApi') as string;

	const options: OptionsWithUri = {
		headers: {},
		method,
		body,
		qs: query,
		uri: uri || `https://plugins.twake.app/plugins/n8n${resource}`,
		json: true,
	};

	// if (authenticationMethod === 'cloud') {
	// } else {
	// 	const credentials = await this.getCredentials('twakeServerApi');
	// 	options.auth = { user: credentials!.publicId as string, pass: credentials!.privateApiKey as string };
	// 	options.uri = `${credentials!.hostUrl}/api/v1${resource}`;
	// }

	try {
		return await this.helpers.requestWithAuthentication.call(this, 'twakeCloudApi', options);
	} catch (error) {
		if (error.error?.code === 'ECONNREFUSED') {
			throw new NodeApiError(this.getNode(), error, { message: 'Twake host is not accessible!' });
		}
		throw new NodeApiError(this.getNode(), error);
	}
}
