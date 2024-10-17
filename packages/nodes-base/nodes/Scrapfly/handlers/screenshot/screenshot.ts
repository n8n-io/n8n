import { IExecuteFunctions, INodeExecutionData, IRequestOptions, NodeApiError } from 'n8n-workflow';
import { OptionsWithUri } from 'request';
import { DefineScreenshotParams } from './params';

interface screenshotError {
	scrapflyErrorCode: string;
	httpCode: string;
	message: string;
	reason?: string;
}

export async function screenshot(
	this: IExecuteFunctions,
	i: number,
	item: INodeExecutionData,
	userAgent: string,
): Promise<any> {
	let responseData;
	const params = DefineScreenshotParams.call(this, i);

	const url = params.get('url');
	const format = params.get('format') || 'jpg';
	let fileName =
		params.get('fileName') || (url ? url.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'unknown');
	fileName = fileName + '.' + format;

	const options: OptionsWithUri = {
		headers: {
			accept: 'application/json',
			'accept-encoding': 'gzip, deflate, br',
			'user-agent': userAgent,
		},
		method: 'GET',
		uri: `https://api.scrapfly.io/screenshot?${params.toString()}`,
		//@ts-ignore
		resolveWithFullResponse: true, // return the full response instead of just the body
		encoding: null, // disable endoing to get the screenshot body as Buffer
		json: true,
	};

	try {
		responseData = await this.helpers.requestWithAuthentication.call(
			this,
			'ScrapflyApi',
			options as IRequestOptions,
		);
		const mimeType = responseData.headers['content-type'] || 'application/octet-stream';

		const newItem: INodeExecutionData = {
			json: item.json,
			binary: {},
			pairedItem: { item: 0 },
		};

		if (item.binary !== undefined) {
			Object.assign(newItem.binary!, item.binary);
		}

		item = newItem;
		const dataPropertyNameDownload = 'data';

		item.binary![dataPropertyNameDownload] = await this.helpers.prepareBinaryData(
			responseData.body as Buffer,
			fileName as string,
			mimeType as string,
		);

		return item;
	} catch (e: any) {
		const error: screenshotError = {
			scrapflyErrorCode: 'Error',
			httpCode: 'Code',
			message: 'Message',
			reason: 'Reason',
		};

		let body;
		try {
			body = JSON.parse(e.cause.error);
		} catch (jsonError) {
			console.error('Failed to parse error body:', jsonError);
			body = {};
		}

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
