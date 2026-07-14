import type { IExecuteFunctions, ILoadOptionsFunctions, NodeApiError } from 'n8n-workflow';

import type { SERVICE_PRINCIPAL_AUTH } from './constants';

export type ExcelSharePointCredentialType = 'microsoftOAuth2Api' | typeof SERVICE_PRINCIPAL_AUTH;

export type GraphRequestError = {
	httpCode?: string | number | null;
	statusCode?: string | number | null;
	message?: string;
	code?: string;
	error?: { error?: GraphRequestError };
};

export type AuthContext = IExecuteFunctions | ILoadOptionsFunctions;

// Both sign-in methods now go through the same httpRequestWithAuthentication
// call; only the shape of the resulting error still differs by credential type.
export type ErrorMapper = (this: AuthContext, error: GraphRequestError) => NodeApiError;
