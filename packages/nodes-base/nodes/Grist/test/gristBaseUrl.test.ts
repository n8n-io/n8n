import { gristBaseUrl } from '../GenericFunctions';

describe('Grist gristBaseUrl', () => {
	it('uses the unified url field, stripping a trailing slash', () => {
		expect(gristBaseUrl({ url: 'https://api.getgrist.com' })).toBe('https://api.getgrist.com');
		expect(gristBaseUrl({ url: 'https://team.getgrist.com/' })).toBe('https://team.getgrist.com');
		expect(gristBaseUrl({ url: 'http://localhost:8484' })).toBe('http://localhost:8484');
	});

	it('strips a trailing /api, which request paths add themselves', () => {
		expect(gristBaseUrl({ url: 'http://localhost:8484/api' })).toBe('http://localhost:8484');
		expect(gristBaseUrl({ url: 'http://localhost:8484/api/' })).toBe('http://localhost:8484');
	});

	it('keeps a host whose name merely ends in api', () => {
		expect(gristBaseUrl({ url: 'https://api.getgrist.com' })).toBe('https://api.getgrist.com');
		expect(gristBaseUrl({ url: 'https://grist-api.example.com' })).toBe(
			'https://grist-api.example.com',
		);
	});

	describe('legacy credentials without a url', () => {
		it('resolves a stored self-hosted URL, stripping a trailing slash', () => {
			expect(gristBaseUrl({ selfHostedUrl: 'http://localhost:8484/' })).toBe(
				'http://localhost:8484',
			);
		});

		it('strips a trailing /api from a stored self-hosted URL', () => {
			expect(gristBaseUrl({ selfHostedUrl: 'http://localhost:8484/api' })).toBe(
				'http://localhost:8484',
			);
		});

		it('builds the team host from a stored subdomain', () => {
			expect(gristBaseUrl({ customSubdomain: 'acme' })).toBe('https://acme.getgrist.com');
		});

		it('falls back to the SaaS API host (covers the old free plan)', () => {
			expect(gristBaseUrl({ apiKey: 'k' })).toBe('https://api.getgrist.com');
			expect(gristBaseUrl({})).toBe('https://api.getgrist.com');
		});

		it('prefers a self-hosted URL over a subdomain when both are present', () => {
			expect(
				gristBaseUrl({ selfHostedUrl: 'https://grist.example.com', customSubdomain: 'acme' }),
			).toBe('https://grist.example.com');
		});
	});
});
