export interface ICosmosDbCredentials {
	account: string;
	key: string;
	database: string;
	baseUrl: string;
}

export interface IErrorResponse {
	code: string;
	message: string;
}

export interface IContainer {
	partitionKey: {
		paths: string[];
	};
}
