import type {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	IN8nHttpFullResponse,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export async function sendErrorPostReceive(
	this: IExecuteSingleFunctions,
	_data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (response.statusCode && response.statusCode >= 400) {
		const errorBody = response.body as JsonObject;

		if (response.statusCode === 422) {
			const errors = (errorBody.detail as any[])?.map(
				(err) => `${err.loc?.join('.') || 'field'}: ${err.msg || 'Invalid value'}`,
			) || ['Invalid request parameters'];

			throw new NodeApiError(this.getNode(), errorBody, {
				message: 'Validation Error',
				description: errors.join('\n'),
			});
		}

		const message = (errorBody.message || response.statusMessage) as string;
		throw new NodeApiError(this.getNode(), errorBody, {
			message: message || 'Unknown error occurred',
		});
	}
	return [];
}

// ToDo: Remove before completing the pull request
export async function presendTest(
	this: IExecuteSingleFunctions,

	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	console.log('requestOptions', requestOptions);

	return requestOptions;
}
