import { NodeApiError, type IExecuteSingleFunctions, type IHttpRequestOptions } from 'n8n-workflow';

export async function presendLimitField(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const returnAll = this.getNodeParameter('returnAll');
	const limit = !returnAll ? this.getNodeParameter('limit') : undefined;

	if (!returnAll && !limit) {
		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: 'Limit value not found',
				description:
					'Please provide a value for "Limit" or set "Return All" to true to return all results',
			},
		);
	}

	if (limit) {
		requestOptions.headers = {
			...requestOptions.headers,
			'x-ms-max-item-count': limit,
		};
	}

	return requestOptions;
}
