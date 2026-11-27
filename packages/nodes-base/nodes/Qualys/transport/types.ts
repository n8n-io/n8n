import type {
	IDataObject,
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
} from 'n8n-workflow';

export type QualysRequestContext =
	| IExecuteFunctions
	| IExecuteSingleFunctions
	| IHookFunctions
	| ILoadOptionsFunctions
	// A polling trigger authenticates and pages exactly as an execution does.
	| IPollFunctions;

export type QualysPlane = 'ot' | 'gateway' | 'csam' | 'fo';

export type QualysCredential = {
	pod?: string;
	baseUrl?: string;
	platformUrl?: string;
	clientId?: string;
	clientSecret?: string;
	clientGrant?: string;
	/** `basicAuth` (username and password) or `apiClient`, from the node's Authentication field. */
	authType?: string;
	username?: string;
	password?: string;
	requestedWith?: string;
};

export type QualysApiRequestOptions = {
	plane: QualysPlane;
	/** Endpoint path, or an absolute URL when following a paging link. */
	endpoint: string;
	method?: 'GET' | 'POST';
	qs?: IDataObject;
	body?: IDataObject | string;
	/** Parse the response as XML rather than JSON. */
	xml?: boolean;
	/**
	 * Treat HTTP 404 as an empty result instead of an error. Some VMDR OT list
	 * endpoints answer 404 "Files not found" when the account simply holds none.
	 */
	emptyOn404?: boolean;
};

export type QualysApiResponse = {
	statusCode: number;
	headers: IDataObject;
	body: unknown;
};
