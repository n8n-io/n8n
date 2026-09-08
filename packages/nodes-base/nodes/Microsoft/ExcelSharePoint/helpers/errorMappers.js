import { SERVICE_PRINCIPAL_AUTH } from './constants';
import { delegatedApiError, servicePrincipalApiError } from './errorHandler';
const ERROR_MAPPERS = {
    microsoftOAuth2Api: delegatedApiError,
    [SERVICE_PRINCIPAL_AUTH]: servicePrincipalApiError,
};
export function getErrorMapper(credentialType) {
    return ERROR_MAPPERS[credentialType];
}
//# sourceMappingURL=errorMappers.js.map