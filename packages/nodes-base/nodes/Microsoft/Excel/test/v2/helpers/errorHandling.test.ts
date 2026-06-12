import { mapMicrosoftApiError } from '../../../v2/helpers/errorHandling';

describe('mapMicrosoftApiError', () => {
	it('maps SharePoint license errors to a license message', () => {
		const result = mapMicrosoftApiError({
			statusCode: 403,
			error: { code: 'accessDenied', message: 'SharePoint License required' },
		});
		expect(result?.message).toContain('missing a required license');
	});

	it('maps access-denied (403) to a permissions message', () => {
		const result = mapMicrosoftApiError({
			statusCode: 403,
			error: { code: 'accessDenied', message: 'Access denied' },
		});
		expect(result?.message).toContain('missing the required permissions');
	});

	it('maps invalid auth token (401) to a permissions message', () => {
		const result = mapMicrosoftApiError({ statusCode: 401, message: 'InvalidAuthenticationToken' });
		expect(result?.message).toContain('missing the required permissions');
	});

	it('prioritises the license message over the generic permissions one', () => {
		const result = mapMicrosoftApiError({
			statusCode: 403,
			error: { message: 'A SharePoint license is required' },
		});
		expect(result?.description).toContain('license');
	});

	it('returns undefined for unrelated errors', () => {
		expect(
			mapMicrosoftApiError({ statusCode: 500, message: 'Internal server error' }),
		).toBeUndefined();
		expect(
			mapMicrosoftApiError({ statusCode: 404, error: { code: 'itemNotFound' } }),
		).toBeUndefined();
	});

	it('does not mislabel a non-auth error that merely mentions "license"', () => {
		expect(
			mapMicrosoftApiError({
				statusCode: 404,
				error: { code: 'itemNotFound', message: 'The resource could not be found: License.xlsx' },
			}),
		).toBeUndefined();
	});

	it('maps an auth failure by Graph error code when no status code is present', () => {
		const result = mapMicrosoftApiError({
			error: { code: 'accessDenied', message: 'Access denied' },
		});
		expect(result?.message).toContain('missing the required permissions');
	});
});
