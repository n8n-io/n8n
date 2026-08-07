import { recordConsumedAuth, redactedHeaders, REDACTED } from '../src/consumed-auth';

const request = (headers: Record<string, string | string[] | undefined>) => ({ headers });

describe('recordConsumedAuth / redactedHeaders', () => {
	it('should not change the request', () => {
		const req = request({ authorization: 'Bearer secret', 'x-tenant-id': 'acme' });

		recordConsumedAuth(req, { headers: ['authorization'] });
		redactedHeaders(req);

		expect(req.headers).toEqual({ authorization: 'Bearer secret', 'x-tenant-id': 'acme' });
	});

	it('should redact only the recorded headers', () => {
		const req = request({ authorization: 'Bearer secret', 'x-tenant-id': 'acme' });

		recordConsumedAuth(req, { headers: ['authorization'] });

		expect(redactedHeaders(req)).toEqual({ authorization: REDACTED, 'x-tenant-id': 'acme' });
	});

	it('should redact a credential-named header', () => {
		const req = request({ test: 'secret-value', 'x-tenant-id': 'acme' });

		recordConsumedAuth(req, { headers: ['test'] });

		expect(redactedHeaders(req)).toEqual({ test: REDACTED, 'x-tenant-id': 'acme' });
	});

	it('should not add a header that was recorded but never sent', () => {
		const req = request({ 'x-tenant-id': 'acme' });

		recordConsumedAuth(req, { headers: ['authorization'] });

		expect(redactedHeaders(req)).toEqual({ 'x-tenant-id': 'acme' });
	});

	it('should accumulate across several records', () => {
		const req = request({ authorization: 'a', 'x-auth-token': 'b', keep: 'c' });

		recordConsumedAuth(req, { headers: ['authorization'] });
		recordConsumedAuth(req, { headers: ['x-auth-token'] });

		expect(redactedHeaders(req)).toEqual({
			authorization: REDACTED,
			'x-auth-token': REDACTED,
			keep: 'c',
		});
	});

	it('should redact again on a second call', () => {
		const req = request({ authorization: 'Bearer secret' });

		recordConsumedAuth(req, { headers: ['authorization'] });
		redactedHeaders(req);

		expect(redactedHeaders(req)).toEqual({ authorization: REDACTED });
	});

	it('should return the headers unchanged when nothing was recorded', () => {
		const req = request({ authorization: 'Bearer caller-token' });

		expect(redactedHeaders(req)).toEqual({ authorization: 'Bearer caller-token' });
	});

	it('should not be enumerable on the request', () => {
		const req = request({ authorization: 'Bearer secret' });

		recordConsumedAuth(req, { headers: ['authorization'] });

		expect(Object.keys(req)).toEqual(['headers']);
		expect({ ...req }).toEqual({ headers: { authorization: 'Bearer secret' } });
	});

	describe('cookies', () => {
		it("should redact only the named cookie, keeping the caller's own", () => {
			const req = request({ cookie: 'theme=dark; n8n-auth=session-jwt; locale=en' });

			recordConsumedAuth(req, { cookies: ['n8n-auth'] });

			expect(redactedHeaders(req).cookie).toBe(`theme=dark; n8n-auth=${REDACTED}; locale=en`);
		});

		it('should keep the header when it holds nothing but the named cookie', () => {
			const req = request({ cookie: 'n8n-auth=session-jwt' });

			recordConsumedAuth(req, { cookies: ['n8n-auth'] });

			expect(redactedHeaders(req).cookie).toBe(`n8n-auth=${REDACTED}`);
		});

		it('should not match a cookie whose name merely ends with the target', () => {
			const req = request({ cookie: 'not-n8n-auth=keep-me' });

			recordConsumedAuth(req, { cookies: ['n8n-auth'] });

			expect(redactedHeaders(req).cookie).toBe('not-n8n-auth=keep-me');
		});

		it('should redact a value that itself contains an equals sign', () => {
			const req = request({ cookie: 'n8n-auth=a=b=c; theme=dark' });

			recordConsumedAuth(req, { cookies: ['n8n-auth'] });

			expect(redactedHeaders(req).cookie).toBe(`n8n-auth=${REDACTED}; theme=dark`);
		});

		it('should be a no-op when there is no cookie header', () => {
			const req = request({});

			recordConsumedAuth(req, { cookies: ['n8n-auth'] });

			expect(redactedHeaders(req).cookie).toBeUndefined();
		});
	});
});
