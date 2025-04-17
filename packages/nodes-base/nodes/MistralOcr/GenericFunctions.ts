import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function processResponseData(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	//TODO Remove before send the PR
	console.log('Mistral OCR Response:', JSON.stringify(response.body, null, 2));
	console.log('Response Status Code:', response.statusCode);

	if (!response.body) {
		console.log('No response body found');
		return data;
	}

	const responseData = response.body as JsonObject;
	console.log('Response Data Keys:', Object.keys(responseData));

	return data.map((item) => {
		const newItem = { ...item };

		newItem.json = {
			...newItem.json,
			ocrResult: responseData,
			responseStatusCode: response.statusCode,
			responseDebugInfo: 'Check logs for detailed response information',
		};

		if (responseData.text) {
			console.log('Found text property in response');
			newItem.json.extractedText = responseData.text;
		} else if (responseData.pages) {
			console.log(
				'Found pages property in response with',
				(responseData.pages as IDataObject[]).length,
				'pages',
			);
			const pages = responseData.pages as IDataObject[];

			const extractedText = pages
				.map((page) => {
					if (page.markdown) {
						console.log(`Found markdown content in page ${page.index}: ${page.markdown}`);
						return page.markdown as string;
					} else if (page.text) {
						console.log(`Found text content in page ${page.index}: ${page.text}`);
						return page.text as string;
					}
					return '';
				})
				.filter((text) => text !== '')
				.join('\n\n');

			newItem.json.extractedText = extractedText;
			newItem.json.pageCount = pages.length;

			newItem.json.pages = pages;
		} else {
			console.log('No text or pages property found in response');
			Object.entries(responseData).forEach(([key, value]) => {
				if (typeof value === 'string' && value.length > 0) {
					console.log(`Found potential text in property: ${key}`);
					newItem.json[`found_${key}`] = value;
				}
			});
		}

		return newItem;
	});
}

export async function sendErrorPostReceive(
	this: IExecuteSingleFunctions,
	_data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (response.statusCode && response.statusCode >= 400) {
		const errorBody = response.body as JsonObject;

		let parameterName = '';
		try {
			const inputType = this.getNodeParameter('inputType', null) as string;
			if (inputType === 'url') {
				parameterName = 'Document URL';
			} else if (inputType === 'binary') {
				parameterName = 'Binary Property';
			}
		} catch {}

		if (response.statusCode === 422) {
			const errors = (errorBody.detail as any[])?.map(
				(err) => `${err.loc?.join('.') || 'field'}: ${err.msg || 'Invalid value'}`,
			) || ['Invalid request parameters'];

			throw new NodeApiError(this.getNode(), errorBody, {
				message: parameterName
					? `The request contains invalid parameters in "${parameterName}"`
					: 'The request contains invalid parameters',
				description: `To fix this, update the following values:\n${errors.join('\n')}\n\nMake sure your input values match the required format and try again.`,
			});
		}

		const message = (errorBody.message || response.statusMessage) as string;

		if (message?.toLowerCase().includes('fetching file from url')) {
			const url = message.match(/https?:\/\/[^\s]+/)?.[0] || 'the specified URL';

			throw new NodeApiError(this.getNode(), errorBody, {
				message: parameterName
					? `Unable to access the document at ${url} in "${parameterName}"`
					: `Unable to access the document at ${url}`,
				description:
					"To fix this:\n- Confirm the URL is correct and publicly accessible\n- Make sure the document doesn't require login\n- Check if the server allows external access\n\nAlternatively, download the file and use the Binary Data option instead.",
			});
		}

		throw new NodeApiError(this.getNode(), errorBody, {
			message: message || 'The request to Mistral OCR service was unsuccessful',
			description:
				'To fix this:\n- Double-check your input parameters\n- Verify your API credentials\n- Make sure the Mistral OCR service is available\n- Try a different document or input method',
		});
	}

	// ✅ Success: just return the original items
	return _data;
}

// ToDo: Remove before completing the pull request
export async function presendTest(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	console.log('requestOptions', requestOptions);
	return requestOptions;
}
