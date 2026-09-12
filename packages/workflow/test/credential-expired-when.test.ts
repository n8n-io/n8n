import { isCredentialExpiredWhenSet } from '../src/credential-expired-when';

describe('isCredentialExpiredWhenSet', () => {
	it.each([true, 'true', '={{ $response.body.errcode === 40001 }}'])(
		'treats %j as set',
		(value) => {
			expect(isCredentialExpiredWhenSet(value)).toBe(true);
		},
	);

	it.each([false, 'false', '', null, undefined])('treats %j as unset', (value) => {
		expect(isCredentialExpiredWhenSet(value)).toBe(false);
	});
});
