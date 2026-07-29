import type { IExecuteFunctions } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { SERVICE_PRINCIPAL_AUTH } from '../helpers/constants';
import { getExcelSharePointCredentialType } from '../transport';

describe('Microsoft Excel (SharePoint) Credentials', () => {
	let ctx: Mocked<IExecuteFunctions>;

	beforeEach(() => {
		ctx = mockDeep<IExecuteFunctions>();
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
