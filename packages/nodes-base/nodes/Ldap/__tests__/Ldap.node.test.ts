import { mockDeep } from 'vitest-mock-extended';
import type { Client } from 'ldapts';
import type { IExecuteFunctions } from 'n8n-workflow';

import * as Helpers from '../Helpers';
import { Ldap } from '../Ldap.node';
import type { Mock } from 'vitest';
import type * as _importType0 from '../Helpers';

vi.mock('../Helpers', async () => ({
	...(await vi.importActual<typeof _importType0>('../Helpers')),
	createLdapClient: vi.fn(),
}));

describe('Ldap', () => {
	const executeFunctions = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		vi.resetAllMocks();

		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNode.mockReturnValue({
			type: 'n8n-nodes-base.ldap',
			name: 'LDAP',
			id: '1',
		} as ReturnType<IExecuteFunctions['getNode']>);
		executeFunctions.continueOnFail.mockReturnValue(false);
	});

	describe('search', () => {
		let mockBind: Mock;
		let mockSearch: Mock;
		let mockUnbind: Mock;

		beforeEach(() => {
			mockBind = vi.fn().mockResolvedValue(undefined);
			mockSearch = vi.fn().mockResolvedValue({ searchEntries: [] });
			mockUnbind = vi.fn().mockResolvedValue(undefined);

			const mockClient = {
				bind: mockBind,
				search: mockSearch,
				unbind: mockUnbind,
			};

			vi.spyOn(Helpers, 'createLdapClient').mockResolvedValue(mockClient as unknown as Client);

			executeFunctions.getCredentials.mockResolvedValue({
				hostname: 'ldap.example.com',
				port: 389,
				bindDN: 'cn=admin,dc=example,dc=com',
				bindPassword: 'password',
				connectionSecurity: 'none',
			});
		});

		const baseParameters: Record<string, unknown> = {
			nodeDebug: false,
			operation: 'search',
			baseDN: 'dc=example,dc=com',
			searchFor: '(objectclass=person)',
			returnAll: true,
			limit: 0,
			options: {},
			'options.pageSize': 1000,
			attribute: 'cn',
		};

		function mockParameters(overrides: Record<string, unknown> = {}) {
			const params = { ...baseParameters, ...overrides };
			executeFunctions.getNodeParameter.mockImplementation((parameterName, _idx, defaultValue) => {
				return parameterName in params ? params[parameterName] : defaultValue;
			});
		}

		it('should call client.bind() with credentials during execution', async () => {
			mockParameters({ searchText: 'johndoe' });

			await new Ldap().execute.call(executeFunctions);

			expect(mockBind).toHaveBeenCalledWith('cn=admin,dc=example,dc=com', 'password');
		});

		it('should escape a wildcard (*) in searchText resolved from an expression', async () => {
			mockParameters({ searchText: '={{ $json.query }}' });

			executeFunctions.evaluateExpression.mockImplementation((expr) => {
				if (expr === '{{ $json.query }}') return 'john*doe';
				return expr;
			});

			await new Ldap().execute.call(executeFunctions);

			expect(mockSearch).toHaveBeenCalledWith(
				'dc=example,dc=com',
				expect.objectContaining({
					filter: '(&(objectclass=person)(cn=john\\2adoe))',
				}),
			);
		});

		it('should escape parentheses in searchText resolved from an expression', async () => {
			mockParameters({ searchText: '={{ $json.query }}' });

			executeFunctions.evaluateExpression.mockImplementation((expr) => {
				if (expr === '{{ $json.query }}') return 'john(doe)';
				return expr;
			});

			await new Ldap().execute.call(executeFunctions);

			expect(mockSearch).toHaveBeenCalledWith(
				'dc=example,dc=com',
				expect.objectContaining({
					filter: '(&(objectclass=person)(cn=john\\28doe\\29))',
				}),
			);
		});

		it('should escape backslash in searchText resolved from an expression', async () => {
			mockParameters({ searchText: '={{ $json.query }}' });

			executeFunctions.evaluateExpression.mockImplementation((expr) => {
				if (expr === '{{ $json.query }}') return 'john\\doe';
				return expr;
			});

			await new Ldap().execute.call(executeFunctions);

			expect(mockSearch).toHaveBeenCalledWith(
				'dc=example,dc=com',
				expect.objectContaining({
					filter: '(&(objectclass=person)(cn=john\\5cdoe))',
				}),
			);
		});

		it('should escape multiple special characters in searchText resolved from an expression', async () => {
			mockParameters({ searchText: '={{ $json.query }}' });

			executeFunctions.evaluateExpression.mockImplementation((expr) => {
				if (expr === '{{ $json.query }}') return '*(injection)';
				return expr;
			});

			await new Ldap().execute.call(executeFunctions);

			expect(mockSearch).toHaveBeenCalledWith(
				'dc=example,dc=com',
				expect.objectContaining({
					filter: '(&(objectclass=person)(cn=\\2a\\28injection\\29))',
				}),
			);
		});

		it('should not escape a plain searchText with no special characters', async () => {
			mockParameters({ searchText: '={{ $json.query }}' });

			executeFunctions.evaluateExpression.mockImplementation((expr) => {
				if (expr === '{{ $json.query }}') return 'johndoe';
				return expr;
			});

			await new Ldap().execute.call(executeFunctions);

			expect(mockSearch).toHaveBeenCalledWith(
				'dc=example,dc=com',
				expect.objectContaining({
					filter: '(&(objectclass=person)(cn=johndoe))',
				}),
			);
		});

		it('should pass a wildcard (*) through unescaped when given as static searchText', async () => {
			mockParameters({ searchText: '*' });

			await new Ldap().execute.call(executeFunctions);

			expect(mockSearch).toHaveBeenCalledWith(
				'dc=example,dc=com',
				expect.objectContaining({
					filter: '(&(objectclass=person)(cn=*))',
				}),
			);
		});

		it('should pass static searchText through unescaped when it contains no expression', async () => {
			mockParameters({ searchText: 'john*doe' });

			await new Ldap().execute.call(executeFunctions);

			expect(mockSearch).toHaveBeenCalledWith(
				'dc=example,dc=com',
				expect.objectContaining({
					filter: '(&(objectclass=person)(cn=john*doe))',
				}),
			);
		});

		it('should escape a wildcard (*) in the attribute parameter', async () => {
			mockParameters({ attribute: 'cn*name', searchText: 'johndoe' });

			await new Ldap().execute.call(executeFunctions);

			expect(mockSearch).toHaveBeenCalledWith(
				'dc=example,dc=com',
				expect.objectContaining({
					filter: '(&(objectclass=person)(cn\\2aname=johndoe))',
				}),
			);
		});

		it('should escape parentheses in the attribute parameter', async () => {
			mockParameters({ attribute: 'cn(name)', searchText: 'johndoe' });

			await new Ldap().execute.call(executeFunctions);

			expect(mockSearch).toHaveBeenCalledWith(
				'dc=example,dc=com',
				expect.objectContaining({
					filter: '(&(objectclass=person)(cn\\28name\\29=johndoe))',
				}),
			);
		});

		it('should escape a backslash in the attribute parameter', async () => {
			mockParameters({ attribute: 'cn\\name', searchText: 'johndoe' });

			await new Ldap().execute.call(executeFunctions);

			expect(mockSearch).toHaveBeenCalledWith(
				'dc=example,dc=com',
				expect.objectContaining({
					filter: '(&(objectclass=person)(cn\\5cname=johndoe))',
				}),
			);
		});

		it('should return a large result set without exceeding the maximum call stack size', async () => {
			mockParameters({ searchText: 'johndoe' });

			// A result set large enough to overflow the argument list when spread
			// into Array.prototype.push via `push.apply` (NODE-5326).
			const largeResultSet = Array.from({ length: 500_000 }, (_, i) => ({
				dn: `cn=user${i},dc=example,dc=com`,
			}));
			mockSearch.mockResolvedValue({ searchEntries: largeResultSet });

			const result = await new Ldap().execute.call(executeFunctions);

			expect(result[0]).toHaveLength(largeResultSet.length);
			// Every entry must be wrapped intact (json + pairedItem), not dropped
			// or emptied while appending the large result set.
			expect(result[0][0]).toEqual({
				json: largeResultSet[0],
				pairedItem: { item: 0 },
			});
			expect(result[0][largeResultSet.length - 1]).toEqual({
				json: largeResultSet[largeResultSet.length - 1],
				pairedItem: { item: 0 },
			});
		});

		it('should escape the attribute parameter regardless of whether searchText contains an expression', async () => {
			mockParameters({ attribute: 'cn*name', searchText: '={{ $json.query }}' });

			executeFunctions.evaluateExpression.mockImplementation((expr) => {
				if (expr === '{{ $json.query }}') return 'johndoe';
				return expr;
			});

			await new Ldap().execute.call(executeFunctions);

			expect(mockSearch).toHaveBeenCalledWith(
				'dc=example,dc=com',
				expect.objectContaining({
					filter: '(&(objectclass=person)(cn\\2aname=johndoe))',
				}),
			);
		});

		describe('custom filter', () => {
			const customFilterTemplate = '=(&(objectClass=inetOrgPerson)(cn={{ $json.body.username }}))';

			function mockCustomFilter(customFilter: string, resolvedValue?: string) {
				mockParameters({ searchFor: 'custom', customFilter });

				executeFunctions.evaluateExpression.mockImplementation((expr) => {
					if (expr === '{{ $json.body.username }}') return resolvedValue;
					return expr;
				});
			}

			it('should not escape a plain value resolved from an expression', async () => {
				mockCustomFilter(customFilterTemplate, 'alice');

				await new Ldap().execute.call(executeFunctions);

				expect(mockSearch).toHaveBeenCalledWith(
					'dc=example,dc=com',
					expect.objectContaining({
						filter: '(&(objectClass=inetOrgPerson)(cn=alice))',
					}),
				);
			});

			it('should escape filter special characters resolved from an expression', async () => {
				mockCustomFilter(customFilterTemplate, '*)(|(');

				await new Ldap().execute.call(executeFunctions);

				expect(mockSearch).toHaveBeenCalledWith(
					'dc=example,dc=com',
					expect.objectContaining({
						filter: '(&(objectClass=inetOrgPerson)(cn=\\2a\\29\\28|\\28))',
					}),
				);
			});

			it('should escape a backslash resolved from an expression', async () => {
				mockCustomFilter(customFilterTemplate, 'domain\\alice');

				await new Ldap().execute.call(executeFunctions);

				expect(mockSearch).toHaveBeenCalledWith(
					'dc=example,dc=com',
					expect.objectContaining({
						filter: '(&(objectClass=inetOrgPerson)(cn=domain\\5calice))',
					}),
				);
			});

			it('should keep a `$` sequence resolved from an expression as a literal value', async () => {
				// `$'`, `$&` and similar sequences are meaningful to String.replace, so
				// they must not expand into the surrounding filter syntax
				mockCustomFilter(customFilterTemplate, "$'");

				await new Ldap().execute.call(executeFunctions);

				expect(mockSearch).toHaveBeenCalledWith(
					'dc=example,dc=com',
					expect.objectContaining({
						filter: "(&(objectClass=inetOrgPerson)(cn=$'))",
					}),
				);
			});

			it('should pass a static custom filter through unescaped', async () => {
				mockCustomFilter('(objectclass=*)');

				await new Ldap().execute.call(executeFunctions);

				expect(mockSearch).toHaveBeenCalledWith(
					'dc=example,dc=com',
					expect.objectContaining({ filter: '(objectclass=*)' }),
				);
			});

			it('should keep converting hand-escaped special characters in a static custom filter', async () => {
				mockCustomFilter('(cn=john\\*doe)');

				await new Ldap().execute.call(executeFunctions);

				expect(mockSearch).toHaveBeenCalledWith(
					'dc=example,dc=com',
					expect.objectContaining({ filter: '(cn=john\\2adoe)' }),
				);
			});

			it('should resolve each expression into its own position', async () => {
				mockParameters({
					searchFor: 'custom',
					customFilter: '=(&(cn={{ $json.a }})(sn={{ $json.b }}))',
				});

				// The first value looks like the second expression, so a resolved value
				// must never be rescanned for expressions
				executeFunctions.evaluateExpression.mockImplementation((expr) => {
					if (expr === '{{ $json.a }}') return '{{ $json.b }}';
					if (expr === '{{ $json.b }}') return 'bob';
					return expr;
				});

				await new Ldap().execute.call(executeFunctions);

				expect(mockSearch).toHaveBeenCalledWith(
					'dc=example,dc=com',
					expect.objectContaining({
						filter: '(&(cn={{ $json.b }})(sn=bob))',
					}),
				);
			});

			it('should resolve the same expression used more than once', async () => {
				mockParameters({
					searchFor: 'custom',
					customFilter: '=(&(cn={{ $json.a }})(sn={{ $json.a }}))',
				});

				executeFunctions.evaluateExpression.mockReturnValue('ali*ce');

				await new Ldap().execute.call(executeFunctions);

				expect(mockSearch).toHaveBeenCalledWith(
					'dc=example,dc=com',
					expect.objectContaining({
						filter: '(&(cn=ali\\2ace)(sn=ali\\2ace))',
					}),
				);
			});

			it('should keep a wildcard the user typed next to an escaped expression value', async () => {
				mockCustomFilter('=(&(objectClass=inetOrgPerson)(cn={{ $json.body.username }}*))', 'ali*');

				await new Ldap().execute.call(executeFunctions);

				expect(mockSearch).toHaveBeenCalledWith(
					'dc=example,dc=com',
					expect.objectContaining({
						filter: '(&(objectClass=inetOrgPerson)(cn=ali\\2a*))',
					}),
				);
			});
		});

		describe('object class', () => {
			it('should pass a selected object class through unescaped', async () => {
				mockParameters({ searchText: 'johndoe' });

				await new Ldap().execute.call(executeFunctions);

				expect(mockSearch).toHaveBeenCalledWith(
					'dc=example,dc=com',
					expect.objectContaining({
						filter: '(&(objectclass=person)(cn=johndoe))',
					}),
				);
			});

			it('should escape filter special characters resolved from an expression', async () => {
				mockParameters({ searchFor: '={{ $json.objectClass }}', searchText: 'johndoe' });

				executeFunctions.evaluateExpression.mockImplementation((expr) => {
					if (expr === '{{ $json.objectClass }}') return '*)(|(';
					return expr;
				});

				await new Ldap().execute.call(executeFunctions);

				expect(mockSearch).toHaveBeenCalledWith(
					'dc=example,dc=com',
					expect.objectContaining({
						filter: '(&\\2a\\29\\28|\\28(cn=johndoe))',
					}),
				);
			});

			it('should escape only the expression output in a hand-written object class', async () => {
				mockParameters({
					searchFor: '=(objectclass={{ $json.objectClass }})',
					searchText: 'johndoe',
				});

				executeFunctions.evaluateExpression.mockImplementation((expr) => {
					if (expr === '{{ $json.objectClass }}') return 'per*son';
					return expr;
				});

				await new Ldap().execute.call(executeFunctions);

				expect(mockSearch).toHaveBeenCalledWith(
					'dc=example,dc=com',
					expect.objectContaining({
						filter: '(&(objectclass=per\\2ason)(cn=johndoe))',
					}),
				);
			});
		});

		describe('raw parameter reads', () => {
			// Escaping only works on the template, so a dropped `rawExpressions` would
			// silently hand back a filter n8n has already interpolated
			it('should read the object class and search text before they are interpolated', async () => {
				mockParameters({ searchText: 'johndoe' });

				await new Ldap().execute.call(executeFunctions);

				expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('searchFor', 0, undefined, {
					rawExpressions: true,
				});
				expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith('searchText', 0, undefined, {
					rawExpressions: true,
				});
			});

			it('should read the custom filter before it is interpolated', async () => {
				mockParameters({ searchFor: 'custom', customFilter: '(objectclass=*)' });

				await new Ldap().execute.call(executeFunctions);

				expect(executeFunctions.getNodeParameter).toHaveBeenCalledWith(
					'customFilter',
					0,
					undefined,
					{ rawExpressions: true },
				);
			});
		});
	});

	describe('rename', () => {
		let mockBind: Mock;
		let mockModifyDN: Mock;
		let mockUnbind: Mock;

		beforeEach(() => {
			mockBind = vi.fn().mockResolvedValue(undefined);
			mockModifyDN = vi.fn().mockResolvedValue(undefined);
			mockUnbind = vi.fn().mockResolvedValue(undefined);

			const mockClient = {
				bind: mockBind,
				modifyDN: mockModifyDN,
				unbind: mockUnbind,
			};

			vi.spyOn(Helpers, 'createLdapClient').mockResolvedValue(mockClient as unknown as Client);

			executeFunctions.getCredentials.mockResolvedValue({
				hostname: 'ldap.example.com',
				port: 389,
				bindDN: 'cn=admin,dc=example,dc=com',
				bindPassword: 'password',
				connectionSecurity: 'none',
			});
		});

		it('should rename an entry when targetDn is longer than 127 bytes', async () => {
			const dn = 'cn=source-user,ou=users,dc=example,dc=com';
			const targetDn = `cn=${'renamed-user-'.repeat(8)},ou=users,dc=example,dc=com`;

			expect(Buffer.byteLength(targetDn, 'utf8')).toBeGreaterThan(127);

			executeFunctions.getNodeParameter.mockImplementation((parameterName, _idx, defaultValue) => {
				const params: Record<string, unknown> = {
					nodeDebug: false,
					operation: 'rename',
					dn,
					targetDn,
				};

				return parameterName in params ? params[parameterName] : defaultValue;
			});

			const result = await new Ldap().execute.call(executeFunctions);

			expect(mockModifyDN).toHaveBeenCalledWith(dn, targetDn);
			expect(result).toEqual([
				[
					{
						json: { dn: targetDn, result: 'success' },
						pairedItem: { item: 0 },
					},
				],
			]);
		});
	});
});
