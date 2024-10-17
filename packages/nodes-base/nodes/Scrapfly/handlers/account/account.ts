import { IExecuteFunctions, IRequestOptions } from 'n8n-workflow';
import { OptionsWithUri } from 'request';

export async function account(this: IExecuteFunctions, userAgent: string): Promise<any> {
	let responseData;
	const options: OptionsWithUri = {
		headers: {
			accept: 'application/json',
			'accept-encoding': 'gzip, deflate, br',
			'user-agent': userAgent,
		},
		method: 'GET',
		uri: 'https://api.scrapfly.io/account',
		json: true,
	};

	responseData = await this.helpers.requestWithAuthentication.call(
		this,
		'ScrapflyApi',
		options as IRequestOptions,
	);
	return responseData;
}
