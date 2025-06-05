import type FormData from 'form-data';
import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import type { Page } from './types';

export async function mistralApiRequest(
	this: IExecuteFunctions,
	method: IHttpRequestMethods,
	resource: string,
	body: IDataObject | FormData = {},
	qs: IDataObject = {},
): Promise<any> {
	const options: IHttpRequestOptions = {
		method,
		body,
		qs,
		url: `https://api.mistral.ai${resource}`,
		json: true,
	};

	if (Object.keys(body).length === 0) {
		delete options.body;
	}
	if (Object.keys(qs).length === 0) {
		delete options.qs;
	}

	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'mistralCloudApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}

export async function encodeBinaryData(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<{ dataUrl: string; fileName: string | undefined }> {
	const binaryProperty = this.getNodeParameter('binaryProperty', itemIndex);
	const binaryData = this.helpers.assertBinaryData(itemIndex, binaryProperty);
	const binaryDataBuffer = await this.helpers.getBinaryDataBuffer(itemIndex, binaryProperty);
	const base64Data = binaryDataBuffer.toString('base64');
	const dataUrl = `data:${binaryData.mimeType};base64,${base64Data}`;

	return { dataUrl, fileName: binaryData.fileName };
}

export function processResponseData(response: IDataObject): IDataObject {
	const pages = response.pages as Page[];
	return {
		...response,
		extractedText: pages.map((page) => page.markdown).join('\n\n'),
		pageCount: pages.length,
	};
}

export async function sendErrorPostReceive(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (response.statusCode >= 400) {
		const inputType = this.getNodeParameter('inputType') as string;
		const parameterName = inputType === 'url' ? 'Document URL' : 'Binary Property';

		const error = response.body as {
			code?: string;
			message?: string;
			type?: string;
			detail?: Array<{
				loc: string[];
				msg: string;
			}>;
		};

		if (response.statusCode === 422) {
			const errorDetails = error.detail?.map(
				(errorDetail) =>
					`${errorDetail.loc?.join('.') || 'field'}: ${errorDetail.msg || 'Invalid value'}`,
			) ?? ['Invalid request parameters'];

			throw new NodeApiError(this.getNode(), error, {
				message: `The request contains invalid parameters in "${parameterName}"`,
				description: `Please make sure your input values match the required format and try again:\n${errorDetails.map((detail) => '<li>' + detail).join('\n')}`,
			});
		}

		if (error.message?.includes('could not be loaded as a valid image')) {
			throw new NodeApiError(this.getNode(), error, {
				message: 'Invalid image URL',
				description: "Please ensure the file is an image or select 'Document' as type",
			});
		}

		if (error.message?.toLowerCase().includes('fetching file from url')) {
			const url =
				inputType === 'url'
					? (this.getNodeParameter('documentUrl') as string)
					: 'the specified URL';

			throw new NodeApiError(this.getNode(), error, {
				message: `Unable to access the file at ${url} in "${parameterName}"`,
				description:
					"To fix this:\n- Confirm the URL is correct and publicly accessible\n- Make sure the file doesn't require authorization\n- Check if the server allows external access\n\nAlternatively, download the file and use the Binary Data option instead.",
			});
		}

		throw new NodeApiError(this.getNode(), error, {
			message: error.message ?? 'The request to Mistral OCR service was unsuccessful',
			description:
				'To fix this:\n- Double-check your input parameters\n- Verify your API credentials\n- Make sure the Mistral OCR service is available\n- Try a different document or input method',
		});
	}

	return items;
}
