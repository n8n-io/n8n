import {
	CREDENTIAL_BLANKING_VALUE,
	CREDENTIAL_EMPTY_VALUE,
	isCredentialSentinelValue,
	stripCredentialSentinels,
} from '../src';

describe('isCredentialSentinelValue', () => {
	it.each([
		CREDENTIAL_BLANKING_VALUE,
		CREDENTIAL_EMPTY_VALUE,
		`=${CREDENTIAL_BLANKING_VALUE}`,
		`=${CREDENTIAL_EMPTY_VALUE}`,
	])('returns true for %s', (value) => {
		expect(isCredentialSentinelValue(value)).toBe(true);
	});

	it.each(['secret', '=', '={{ $secrets.key }}', '', 1, null, undefined, { value: 'x' }])(
		'returns false for %j',
		(value) => {
			expect(isCredentialSentinelValue(value)).toBe(false);
		},
	);
});

describe('stripCredentialSentinels', () => {
	it('replaces sentinels with empty strings, including expression-prefixed ones', () => {
		expect(
			stripCredentialSentinels({
				name: 'Authorization',
				value: CREDENTIAL_BLANKING_VALUE,
				extra: `=${CREDENTIAL_EMPTY_VALUE}`,
				nested: { token: CREDENTIAL_BLANKING_VALUE, keep: 'ok' },
				list: [CREDENTIAL_BLANKING_VALUE, 'keep'],
			}),
		).toEqual({
			name: 'Authorization',
			value: '',
			extra: '',
			nested: { token: '', keep: 'ok' },
			list: ['', 'keep'],
		});
	});

	it('leaves a real secret unchanged', () => {
		const data = { name: 'Authorization', value: 'newer-secret' };
		expect(stripCredentialSentinels(data)).toEqual(data);
	});
});
