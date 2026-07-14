import { SERVICE_PRINCIPAL_AUTH } from './constants';
import { delegatedApiError, servicePrincipalApiError } from './errorHandler';
import type { ErrorMapper, ExcelSharePointCredentialType } from './interfaces';

const ERROR_MAPPERS: Record<ExcelSharePointCredentialType, ErrorMapper> = {
	microsoftOAuth2Api: delegatedApiError,
	[SERVICE_PRINCIPAL_AUTH]: servicePrincipalApiError,
};

export function getErrorMapper(credentialType: ExcelSharePointCredentialType): ErrorMapper {
	return ERROR_MAPPERS[credentialType];
}
