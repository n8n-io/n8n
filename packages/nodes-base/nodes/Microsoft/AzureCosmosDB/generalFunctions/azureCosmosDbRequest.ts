import {
	ApplicationError,
	type IExecuteSingleFunctions,
	type IDataObject,
	type IHttpRequestOptions,
	type ILoadOptionsFunctions,
} from 'n8n-workflow';

export async function makeAzureCosmosDbRequest(
	this: ILoadOptionsFunctions | IExecuteSingleFunctions,
	opts: IHttpRequestOptions,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('microsoftAzureCosmosDbSharedKeyApi');
	const databaseAccount = credentials?.account;

	if (!databaseAccount) {
		throw new ApplicationError('Database account not found in credentials!', { level: 'error' });
	}

	const requestOptions: IHttpRequestOptions = {
		...opts,
		baseURL: credentials.baseUrl as string,
		headers: {
			...opts.headers,
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		json: true,
	};

	const errorMapping: IDataObject = {
		400: 'Bad request!',
		401: 'The Cosmos DB credentials are not valid!',
		403: 'The Cosmos DB credentials are not valid!',
		404: 'The requested resource was not found!',
	};

	try {
		return await this.helpers.requestWithAuthentication.call(
			this,
			'microsoftAzureCosmosDbSharedKeyApi',
			requestOptions,
		);
	} catch (error) {
		const statusCode = error.statusCode || error.cause?.statusCode;
		let errorMessage =
			error.response?.body?.message || error.response?.body?.Message || error.message;

		if (statusCode && errorMapping[statusCode]) {
			throw new ApplicationError(errorMapping[statusCode] as string, { level: 'error' });
		}

		if (error.cause?.error) {
			try {
				errorMessage = error.cause.error.message || errorMessage;
			} catch (ex) {
				throw new ApplicationError(
					`Failed to extract error details: ${ex instanceof Error ? ex.message : 'Unknown error'}`,
					{
						level: 'error',
					},
				);
			}
		}

		throw new ApplicationError(`Cosmos DB error response [${statusCode}]: ${errorMessage}`, {
			level: 'error',
		});
	}
}
