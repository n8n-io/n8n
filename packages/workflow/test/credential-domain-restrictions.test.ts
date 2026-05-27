import { ApplicationError } from '@n8n/errors';

import {
	DOMAIN_RESTRICTION_FIELDS,
	assertCredentialAllowsUrl,
	assertUrlAllowed,
	getCredentialAllowedDomains,
	injectDomainRestrictionFields,
	isDomainAllowed,
} from '../src/credential-domain-restrictions';
import { NodeOperationError } from '../src/errors/node-operation.error';
import type {
	ICredentialDataDecryptedObject,
	ICredentialType,
	INode,
	INodeProperties,
} from '../src/interfaces';

const node: INode = {
	id: 'test-node',
	name: 'Test Node',
	type: 'test',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('isDomainAllowed', () => {
	describe('when no allowed domains are specified', () => {
		it('should allow all domains when allowedDomains is empty', () => {
			expect(isDomainAllowed({ url: 'https://example.com', allowedDomains: '' })).toBe(true);
		});

		it('should allow all domains when allowedDomains contains only whitespace', () => {
			expect(isDomainAllowed({ url: 'https://example.com', allowedDomains: '   ' })).toBe(true);
		});
	});

	describe('in strict validation mode', () => {
		it('should allow exact domain matches', () => {
			expect(isDomainAllowed({ url: 'https://example.com', allowedDomains: 'example.com' })).toBe(
				true,
			);
		});

		it('should allow domains from a comma-separated list', () => {
			expect(
				isDomainAllowed({
					url: 'https://example.com',
					allowedDomains: 'test.com,example.com,other.org',
				}),
			).toBe(true);
		});

		it('should handle whitespace in allowed domains list', () => {
			expect(
				isDomainAllowed({
					url: 'https://example.com',
					allowedDomains: ' test.com , example.com , other.org ',
				}),
			).toBe(true);
		});

		it('should block non-matching domains', () => {
			expect(isDomainAllowed({ url: 'https://malicious.com', allowedDomains: 'example.com' })).toBe(
				false,
			);
		});

		it('should block subdomains not set', () => {
			expect(
				isDomainAllowed({ url: 'https://sub.example.com', allowedDomains: 'example.com' }),
			).toBe(false);
		});
	});

	describe('with wildcard domains', () => {
		it('should allow matching wildcard domains', () => {
			expect(
				isDomainAllowed({ url: 'https://test.example.com', allowedDomains: '*.example.com' }),
			).toBe(true);
		});

		it('should block correctly for wildcards', () => {
			expect(
				isDomainAllowed({
					url: 'https://domain-test.com',
					allowedDomains: '*.test.com,example.com',
				}),
			).toBe(false);
		});

		it('should allow nested subdomains with wildcards', () => {
			expect(
				isDomainAllowed({
					url: 'https://deep.nested.example.com',
					allowedDomains: '*.example.com',
				}),
			).toBe(true);
		});

		it('should block non-matching domains with wildcards', () => {
			expect(isDomainAllowed({ url: 'https://example.org', allowedDomains: '*.example.com' })).toBe(
				false,
			);
		});

		it('should block domains that share suffix but are not subdomains', () => {
			expect(
				isDomainAllowed({
					url: 'https://malicious-example.com',
					allowedDomains: '*.example.com',
				}),
			).toBe(false);
		});

		it('should not allow base domain with wildcard alone', () => {
			expect(isDomainAllowed({ url: 'https://example.com', allowedDomains: '*.example.com' })).toBe(
				false,
			);
		});

		it('should allow base domain when explicitly specified alongside wildcard', () => {
			expect(
				isDomainAllowed({
					url: 'https://example.com',
					allowedDomains: 'example.com,*.example.com',
				}),
			).toBe(true);
			expect(
				isDomainAllowed({
					url: 'https://sub.example.com',
					allowedDomains: 'example.com,*.example.com',
				}),
			).toBe(true);
		});

		it('should handle empty wildcard suffix', () => {
			expect(isDomainAllowed({ url: 'https://example.com', allowedDomains: '*.' })).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('should handle invalid URLs safely', () => {
			expect(isDomainAllowed({ url: 'not-a-valid-url', allowedDomains: 'example.com' })).toBe(
				false,
			);
		});

		it('should handle URLs with ports', () => {
			expect(
				isDomainAllowed({
					url: 'https://example.com:8080/path',
					allowedDomains: 'example.com',
				}),
			).toBe(true);
		});

		it('should handle URLs with authentication', () => {
			expect(
				isDomainAllowed({
					url: 'https://user:pass@example.com',
					allowedDomains: 'example.com',
				}),
			).toBe(true);
		});

		it('should handle URLs with query parameters and fragments', () => {
			expect(
				isDomainAllowed({
					url: 'https://example.com/path?query=test#fragment',
					allowedDomains: 'example.com',
				}),
			).toBe(true);
		});

		it('should handle IP addresses', () => {
			expect(isDomainAllowed({ url: 'https://192.168.1.1', allowedDomains: '192.168.1.1' })).toBe(
				true,
			);
		});

		it('should handle empty URLs', () => {
			expect(isDomainAllowed({ url: '', allowedDomains: 'example.com' })).toBe(false);
		});

		it('should be case-insensitive for domains', () => {
			expect(isDomainAllowed({ url: 'https://EXAMPLE.COM', allowedDomains: 'example.com' })).toBe(
				true,
			);
			expect(isDomainAllowed({ url: 'https://example.com', allowedDomains: 'EXAMPLE.COM' })).toBe(
				true,
			);
			expect(isDomainAllowed({ url: 'https://Example.Com', allowedDomains: 'example.com' })).toBe(
				true,
			);
		});

		it('should handle trailing dots in hostnames', () => {
			expect(isDomainAllowed({ url: 'https://example.com.', allowedDomains: 'example.com' })).toBe(
				true,
			);
			expect(isDomainAllowed({ url: 'https://example.com', allowedDomains: 'example.com.' })).toBe(
				true,
			);
		});

		it('should handle empty hostnames', () => {
			expect(isDomainAllowed({ url: 'http://', allowedDomains: 'example.com' })).toBe(false);
		});
	});
});

describe('getCredentialAllowedDomains', () => {
	it("returns undefined for 'all' mode", () => {
		expect(
			getCredentialAllowedDomains({
				node,
				credentialData: { allowedHttpRequestDomains: 'all' },
			}),
		).toBeUndefined();
	});

	it('returns undefined when the field is missing', () => {
		expect(getCredentialAllowedDomains({ node, credentialData: {} })).toBeUndefined();
	});

	it("returns the trimmed allowlist for 'domains' mode", () => {
		expect(
			getCredentialAllowedDomains({
				node,
				credentialData: {
					allowedHttpRequestDomains: 'domains',
					allowedDomains: '  example.com, *.api.io  ',
				},
			}),
		).toBe('example.com, *.api.io');
	});

	it("throws for 'none' with the default surface", () => {
		expect(() =>
			getCredentialAllowedDomains({
				node,
				credentialData: { allowedHttpRequestDomains: 'none' },
			}),
		).toThrow(NodeOperationError);
		expect(() =>
			getCredentialAllowedDomains({
				node,
				credentialData: { allowedHttpRequestDomains: 'none' },
			}),
		).toThrow('This credential is configured to prevent use within an HTTP Request node');
	});

	it("uses the surface name in the 'none' error message", () => {
		expect(() =>
			getCredentialAllowedDomains({
				node,
				credentialData: { allowedHttpRequestDomains: 'none' },
				surface: 'MCP Client Tool',
			}),
		).toThrow('This credential is configured to prevent use within an MCP Client Tool node');
	});

	it("throws for 'domains' with empty allowlist", () => {
		expect(() =>
			getCredentialAllowedDomains({
				node,
				credentialData: { allowedHttpRequestDomains: 'domains', allowedDomains: '' },
			}),
		).toThrow('No allowed domains specified');
	});

	it("throws for 'domains' with whitespace-only allowlist", () => {
		expect(() =>
			getCredentialAllowedDomains({
				node,
				credentialData: { allowedHttpRequestDomains: 'domains', allowedDomains: '   ' },
			}),
		).toThrow('No allowed domains specified');
	});
});

describe('assertUrlAllowed', () => {
	it('is a no-op when allowedDomains is undefined', () => {
		expect(() => assertUrlAllowed({ url: 'https://example.com' })).not.toThrow();
	});

	it('is a no-op when allowedDomains is empty', () => {
		expect(() =>
			assertUrlAllowed({ url: 'https://example.com', allowedDomains: '' }),
		).not.toThrow();
	});

	it('allows URLs in the allowlist', () => {
		expect(() =>
			assertUrlAllowed({ url: 'https://example.com', allowedDomains: 'example.com' }),
		).not.toThrow();
	});

	it('throws ApplicationError on a non-matching URL when no node is provided', () => {
		expect(() =>
			assertUrlAllowed({ url: 'https://attacker.example', allowedDomains: 'example.com' }),
		).toThrow(ApplicationError);
		expect(() =>
			assertUrlAllowed({ url: 'https://attacker.example', allowedDomains: 'example.com' }),
		).toThrow(
			'Domain not allowed: This credential is restricted from accessing https://attacker.example. Only the following domains are allowed: example.com',
		);
	});

	it('throws NodeOperationError on a non-matching URL when node is provided', () => {
		expect(() =>
			assertUrlAllowed({
				node,
				url: 'https://attacker.example',
				allowedDomains: 'example.com',
			}),
		).toThrow(NodeOperationError);
	});
});

describe('assertCredentialAllowsUrl', () => {
	describe('without pinnedUrl (standard semantic)', () => {
		it("no-op for 'all' mode", () => {
			expect(() =>
				assertCredentialAllowsUrl({
					node,
					credentialData: { allowedHttpRequestDomains: 'all' },
					url: 'https://example.com',
				}),
			).not.toThrow();
		});

		it('no-op when no policy field is present', () => {
			expect(() =>
				assertCredentialAllowsUrl({ node, credentialData: {}, url: 'https://example.com' }),
			).not.toThrow();
		});

		it("allows URLs matching the allowlist for 'domains'", () => {
			expect(() =>
				assertCredentialAllowsUrl({
					node,
					credentialData: { allowedHttpRequestDomains: 'domains', allowedDomains: 'example.com' },
					url: 'https://example.com',
				}),
			).not.toThrow();
		});

		it("rejects URLs outside the allowlist for 'domains'", () => {
			expect(() =>
				assertCredentialAllowsUrl({
					node,
					credentialData: { allowedHttpRequestDomains: 'domains', allowedDomains: 'example.com' },
					url: 'https://attacker.example',
				}),
			).toThrow(NodeOperationError);
			expect(() =>
				assertCredentialAllowsUrl({
					node,
					credentialData: { allowedHttpRequestDomains: 'domains', allowedDomains: 'example.com' },
					url: 'https://attacker.example',
				}),
			).toThrow(
				'Domain not allowed: This credential is restricted from accessing https://attacker.example. Only the following domains are allowed: example.com',
			);
		});

		it("throws for 'none' regardless of credential URL field", () => {
			expect(() =>
				assertCredentialAllowsUrl({
					node,
					credentialData: { allowedHttpRequestDomains: 'none', url: 'https://example.com' },
					url: 'https://example.com',
				}),
			).toThrow(NodeOperationError);
		});

		it("includes surface in the 'none' message", () => {
			expect(() =>
				assertCredentialAllowsUrl({
					node,
					credentialData: { allowedHttpRequestDomains: 'none' },
					url: 'https://example.com',
					surface: 'MCP Client Tool',
				}),
			).toThrow('This credential is configured to prevent use within an MCP Client Tool node');
		});
	});

	describe('with pinnedUrl (base-URL-override semantic)', () => {
		it("no-op for 'all' mode", () => {
			expect(() =>
				assertCredentialAllowsUrl({
					node,
					credentialData: { allowedHttpRequestDomains: 'all' },
					url: 'https://attacker.example',
					pinnedUrl: 'https://example.com',
				}),
			).not.toThrow();
		});

		it('no-op when no policy field is present', () => {
			expect(() =>
				assertCredentialAllowsUrl({
					node,
					credentialData: {},
					url: 'https://attacker.example',
					pinnedUrl: 'https://example.com',
				}),
			).not.toThrow();
		});

		describe("'domains' mode", () => {
			it('rejects non-matching URLs', () => {
				expect(() =>
					assertCredentialAllowsUrl({
						node,
						credentialData: {
							allowedHttpRequestDomains: 'domains',
							allowedDomains: 'example.com',
						},
						url: 'https://attacker.example',
						pinnedUrl: 'https://example.com',
					}),
				).toThrow(NodeOperationError);
			});

			it('allows matching URLs', () => {
				expect(() =>
					assertCredentialAllowsUrl({
						node,
						credentialData: {
							allowedHttpRequestDomains: 'domains',
							allowedDomains: 'example.com',
						},
						url: 'https://example.com',
						pinnedUrl: 'https://example.com',
					}),
				).not.toThrow();
			});

			it('throws when the allowlist is empty', () => {
				expect(() =>
					assertCredentialAllowsUrl({
						node,
						credentialData: { allowedHttpRequestDomains: 'domains', allowedDomains: '' },
						url: 'https://example.com',
						pinnedUrl: 'https://example.com',
					}),
				).toThrow('No allowed domains specified');
			});
		});

		describe("'none' mode", () => {
			it('allows when URL equals the pinned URL', () => {
				expect(() =>
					assertCredentialAllowsUrl({
						node,
						credentialData: { allowedHttpRequestDomains: 'none', url: 'https://example.com' },
						url: 'https://example.com',
						pinnedUrl: 'https://example.com',
					}),
				).not.toThrow();
			});

			it('rejects when URL does not equal the pinned URL', () => {
				expect(() =>
					assertCredentialAllowsUrl({
						node,
						credentialData: { allowedHttpRequestDomains: 'none', url: 'https://example.com' },
						url: 'https://attacker.example',
						pinnedUrl: 'https://example.com',
					}),
				).toThrow(NodeOperationError);
				expect(() =>
					assertCredentialAllowsUrl({
						node,
						credentialData: { allowedHttpRequestDomains: 'none', url: 'https://example.com' },
						url: 'https://attacker.example',
						pinnedUrl: 'https://example.com',
					}),
				).toThrow(
					'Domain not allowed: This credential is restricted from accessing https://attacker.example.',
				);
			});

			it('is a no-op when pinnedUrl is undefined (carryover)', () => {
				expect(() =>
					assertCredentialAllowsUrl({
						node,
						credentialData: { allowedHttpRequestDomains: 'none' },
						url: 'https://anywhere.example',
						pinnedUrl: undefined,
					}),
				).not.toThrow();
			});

			it('is a no-op when pinnedUrl is an empty string (carryover)', () => {
				expect(() =>
					assertCredentialAllowsUrl({
						node,
						credentialData: { allowedHttpRequestDomains: 'none', url: '' },
						url: 'https://anywhere.example',
						pinnedUrl: '',
					}),
				).not.toThrow();
			});

			it.each([
				['different protocol', 'https://example.com', 'http://example.com'],
				['different path', 'https://example.com', 'https://example.com/path'],
			])('rejects on %s', (_label, pinned, requested) => {
				const credentials: ICredentialDataDecryptedObject = {
					allowedHttpRequestDomains: 'none',
					url: pinned,
				};
				expect(() =>
					assertCredentialAllowsUrl({
						node,
						credentialData: credentials,
						url: requested,
						pinnedUrl: pinned,
					}),
				).toThrow(NodeOperationError);
			});
		});
	});

	describe('return value', () => {
		it("returns undefined for 'all' mode", () => {
			expect(
				assertCredentialAllowsUrl({
					node,
					credentialData: { allowedHttpRequestDomains: 'all' },
					url: 'https://example.com',
				}),
			).toBeUndefined();
		});

		it('returns undefined when no policy field is present', () => {
			expect(
				assertCredentialAllowsUrl({ node, credentialData: {}, url: 'https://example.com' }),
			).toBeUndefined();
		});

		it("returns the allowlist string for 'domains' mode", () => {
			expect(
				assertCredentialAllowsUrl({
					node,
					credentialData: {
						allowedHttpRequestDomains: 'domains',
						allowedDomains: 'example.com, *.api.example.com',
					},
					url: 'https://example.com',
				}),
			).toBe('example.com, *.api.example.com');
		});

		it("returns undefined for 'none' mode with a matching pinnedUrl", () => {
			expect(
				assertCredentialAllowsUrl({
					node,
					credentialData: { allowedHttpRequestDomains: 'none' },
					url: 'https://example.com',
					pinnedUrl: 'https://example.com',
				}),
			).toBeUndefined();
		});
	});
});

describe('injectDomainRestrictionFields', () => {
	const dummyField: INodeProperties = {
		displayName: 'Token',
		name: 'token',
		type: 'string',
		default: '',
	};

	const baseCredential = (overrides: Partial<ICredentialType>): ICredentialType => ({
		name: 'test',
		displayName: 'Test',
		properties: [dummyField],
		...overrides,
	});

	describe('when injection is required', () => {
		it("appends restriction fields when 'authenticate' is set", () => {
			const result = injectDomainRestrictionFields(
				baseCredential({ authenticate: { type: 'generic', properties: {} } }),
			);
			expect(result).toHaveLength(3);
			expect(result[0]).toBe(dummyField);
			expect(result[1].name).toBe('allowedHttpRequestDomains');
			expect(result[2].name).toBe('allowedDomains');
		});

		it("appends restriction fields when 'genericAuth' is set", () => {
			const result = injectDomainRestrictionFields(baseCredential({ genericAuth: true }));
			expect(result).toHaveLength(3);
			expect(result[1].name).toBe('allowedHttpRequestDomains');
			expect(result[2].name).toBe('allowedDomains');
		});

		it.each(['oAuth2Api', 'oAuth1Api', 'googleOAuth2Api'])(
			'appends restriction fields when extending %s',
			(parent) => {
				const result = injectDomainRestrictionFields(baseCredential({ extends: [parent] }));
				expect(result).toHaveLength(3);
				expect(result[1].name).toBe('allowedHttpRequestDomains');
				expect(result[2].name).toBe('allowedDomains');
			},
		);

		it('is idempotent — calling twice does not duplicate the fields', () => {
			const credentialType = baseCredential({
				authenticate: { type: 'generic', properties: {} },
			});
			const once = injectDomainRestrictionFields(credentialType);
			const twice = injectDomainRestrictionFields({ ...credentialType, properties: once });
			expect(twice).toEqual(once);
		});

		it('does not mutate the input properties array', () => {
			const properties = [dummyField];
			injectDomainRestrictionFields(
				baseCredential({ authenticate: { type: 'generic', properties: {} }, properties }),
			);
			expect(properties).toHaveLength(1);
		});
	});

	describe('when injection is not required', () => {
		it('returns properties unchanged for credentials without auth or known parents', () => {
			const credentialType = baseCredential({});
			const result = injectDomainRestrictionFields(credentialType);
			expect(result).toBe(credentialType.properties);
		});

		it('returns properties unchanged for credentials extending non-OAuth parents', () => {
			const credentialType = baseCredential({ extends: ['someOtherApi', 'anotherApi'] });
			const result = injectDomainRestrictionFields(credentialType);
			expect(result).toBe(credentialType.properties);
		});
	});
});

describe('DOMAIN_RESTRICTION_FIELDS', () => {
	it('exposes the two field definitions', () => {
		expect(DOMAIN_RESTRICTION_FIELDS).toHaveLength(2);
		expect(DOMAIN_RESTRICTION_FIELDS[0].name).toBe('allowedHttpRequestDomains');
		expect(DOMAIN_RESTRICTION_FIELDS[1].name).toBe('allowedDomains');
	});
});
