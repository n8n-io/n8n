import type { INodeParameters } from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';

import { GristApi } from '../../../credentials/GristApi.credentials';
import { gristBaseUrl } from '../GenericFunctions';
import type { GristCredentials } from '../types';

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

	// Before a node sees credential data, n8n merges in the defaults of the declared
	// credential fields and drops any stored value whose field is not declared. These
	// tests resolve the base URL through that same step, so they fail if a default
	// shadows the legacy fields or if the legacy fields stop being declared.
	describe('after credential defaults are applied, as at execution time', () => {
		const resolveThroughDefaults = (stored: INodeParameters) => {
			const decrypted = NodeHelpers.getNodeParameters(
				new GristApi().properties,
				stored,
				true,
				false,
				null,
				null,
			);
			return gristBaseUrl(decrypted as GristCredentials);
		};

		it('keeps a legacy self-hosted credential on its own host', () => {
			expect(
				resolveThroughDefaults({
					apiKey: 'k',
					planType: 'selfHosted',
					selfHostedUrl: 'https://grist.example.com',
				}),
			).toBe('https://grist.example.com');
		});

		it('keeps a legacy team credential on its subdomain host', () => {
			expect(
				resolveThroughDefaults({ apiKey: 'k', planType: 'paid', customSubdomain: 'acme' }),
			).toBe('https://acme.getgrist.com');
		});

		it('uses the stored url when one has been saved', () => {
			expect(resolveThroughDefaults({ apiKey: 'k', url: 'https://grist.example.com' })).toBe(
				'https://grist.example.com',
			);
		});

		it('sends a new credential with the url left empty to the SaaS API host', () => {
			expect(resolveThroughDefaults({ apiKey: 'k', url: '' })).toBe('https://api.getgrist.com');
		});
	});
});
