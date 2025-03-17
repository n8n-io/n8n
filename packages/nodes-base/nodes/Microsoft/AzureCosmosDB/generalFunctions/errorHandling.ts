import {
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
} from 'n8n-workflow';

export async function handleErrorPostReceive(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
		const responseBody = response.body as IDataObject;
		let errorMessage = 'Unknown Error';
		let errorDescription = 'An unexpected error was encountered.';

		if (typeof responseBody === 'object' && responseBody !== null) {
			if (typeof responseBody.code === 'string') {
				errorMessage = responseBody.code;
			}

			if (typeof responseBody.message === 'string') {
				const match = responseBody.message.split('More info:')[0]?.trim();
				errorDescription = match || errorDescription;
			}
		}

		throw new NodeApiError(
			this.getNode(),
			{},
			{
				message: errorMessage,
				description: errorDescription,
			},
		);
	}
	return data;
}
