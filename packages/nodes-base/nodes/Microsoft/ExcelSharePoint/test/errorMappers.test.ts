import { SERVICE_PRINCIPAL_AUTH } from '../helpers/constants';
import { delegatedApiError, servicePrincipalApiError } from '../helpers/errorHandler';
import { getErrorMapper } from '../helpers/errorMappers';

describe('Microsoft Excel (SharePoint) Error Mappers', () => {
	it('returns the delegated mapper for the generic OAuth2 credential', () => {
		expect(getErrorMapper('microsoftOAuth2Api')).toBe(delegatedApiError);
	});

	it('returns the Service Principal mapper for the Service Principal credential', () => {
		expect(getErrorMapper(SERVICE_PRINCIPAL_AUTH)).toBe(servicePrincipalApiError);
	});
});
