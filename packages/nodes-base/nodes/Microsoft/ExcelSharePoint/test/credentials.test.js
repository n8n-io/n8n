import { mockDeep } from 'vitest-mock-extended';
import { SERVICE_PRINCIPAL_AUTH } from '../helpers/constants';
import { getExcelSharePointCredentialType } from '../transport';
describe('Microsoft Excel (SharePoint) Credentials', () => {
    let ctx;
    beforeEach(() => {
        ctx = mockDeep();
    });
    it('returns the Service Principal type when selected', () => {
        ctx.getNodeParameter.mockReturnValue(SERVICE_PRINCIPAL_AUTH);
        expect(getExcelSharePointCredentialType.call(ctx)).toBe(SERVICE_PRINCIPAL_AUTH);
    });
    it('defaults to the generic OAuth2 type for any other selection', () => {
        ctx.getNodeParameter.mockReturnValue(undefined);
        expect(getExcelSharePointCredentialType.call(ctx)).toBe('microsoftOAuth2Api');
    });
});
//# sourceMappingURL=credentials.test.js.map