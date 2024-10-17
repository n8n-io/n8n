import { IExecuteFunctions, IRequestOptions, NodeApiError } from 'n8n-workflow';
import { OptionsWithUri } from 'request';
import { DefineExtractionParams } from './params';

interface extractionError {
	scrapflyErrorCode: string;
	httpCode: string;
	message: string;
	reason?: string;
}

export async function extract(this: IExecuteFunctions, i: number, userAgent: string): Promise<any> {
	let responseData;

	const params = DefineExtractionParams.call(this, i);
	const options: OptionsWithUri = {
		headers: {
			accept: 'application/json',
			'user-agent': userAgent,
		},
		method: 'POST',
		uri: `https://api.scrapfly.io/extraction?${params.toString()}`,
		json: true,
	};

	options.body = params.get('body');

	try {
		responseData = await this.helpers.requestWithAuthentication.call(
			this,
			'ScrapflyApi',
			options as IRequestOptions,
		);
		return responseData;
	} catch (e: any) {
		const error: extractionError = {
			scrapflyErrorCode: 'Error',
			httpCode: 'Code',
			message: 'Message',
			reason: 'Reason',
		};

		const body = e.cause.error;
		error.httpCode = e.httpCode || error.httpCode;
		error.scrapflyErrorCode = body.code || error.scrapflyErrorCode;
		error.message = body.message || error.message;
		error.reason = body.reason || error.reason;

		throw new NodeApiError(this.getNode(), e, {
			httpCode: error.httpCode,
			description: `[${error.scrapflyErrorCode}] ${error.reason}`,
			message: error.message,
		});
	}
}
