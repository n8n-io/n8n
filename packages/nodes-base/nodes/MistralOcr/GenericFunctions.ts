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
			newItem.json.extractedText = pages
				.map((page) => page.markdown || page.text || '')
				.join('\n\n');
			newItem.json.pageCount = pages.length;
		}
		if (responseData.processed_file) {
			newItem.binary = {
				...newItem.binary,
				processedDocument: {
					data: responseData.processed_file as string,
					fileName: `processed-${Date.now()}.pdf`,
					mimeType: 'application/pdf',
				},
			};
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
		let inputType = '';
		try {
			inputType = this.getNodeParameter('inputType', null) as string;
			parameterName = inputType === 'url' ? 'Document URL' : 'Binary Property';
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

	return _data;
}

export async function handleBinaryData(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const propName = this.getNodeParameter('binaryProperty') as string;
	const binary = this.helpers.assertBinaryData(propName);
	const buffer = await this.helpers.getBinaryDataBuffer(propName);

	const model = this.getNodeParameter('model') as string;

	const base64Data = buffer.toString('base64');
	const dataURL = `data:${binary.mimeType};base64,${base64Data}`;

	const jsonBody: IDataObject = {
		model,
		document: {
			type: 'document_url',
			document_url: dataURL,
		},
	};

	requestOptions.headers = {
		...requestOptions.headers,
		'Content-Type': 'application/json',
	};

	requestOptions.body = jsonBody;

	return requestOptions;
}
