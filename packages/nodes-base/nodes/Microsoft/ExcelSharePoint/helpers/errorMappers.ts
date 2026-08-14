import type { NodeApiError } from 'n8n-workflow';

import { SERVICE_PRINCIPAL_AUTH, type ExcelSharePointCredentialType } from './constants';
import type { GraphRequestError } from './converters';
import { delegatedApiError, servicePrincipalApiError } from './errorHandler';
import type { AuthContext } from './interfaces';

// Both sign-in methods now go through the same httpRequestWithAuthentication
// call; only the shape of the resulting error still differs by credential type.
export type ErrorMapper = (this: AuthContext, error: GraphRequestError) => NodeApiError;

const ERROR_MAPPERS: Record<ExcelSharePointCredentialType, ErrorMapper> = {
	microsoftOAuth2Api: delegatedApiError,
	[SERVICE_PRINCIPAL_AUTH]: servicePrincipalApiError,
};

export function getErrorMapper(credentialType: ExcelSharePointCredentialType): ErrorMapper {
	return ERROR_MAPPERS[credentialType];
}
