import { mockDeep } from 'jest-mock-extended';
import type { Client } from 'ldapts';
import type { IExecuteFunctions } from 'n8n-workflow';

import * as Helpers from '../Helpers';
import { Ldap } from '../Ldap.node';

jest.mock('../Helpers', () => ({
	...jest.requireActual('../Helpers'),
	createLdapClient: jest.fn(),
}));

describe('Ldap', () => {
	const executeFunctions = mockDeep<IExecuteFunctions>();

	beforeEach(() => {
		jest.resetAllMocks();

		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNode.mockReturnValue({
			type: 'n8n-nodes-base.ldap',
			name: 'LDAP',
			id: '1',
		} as ReturnType<IExecuteFunctions['getNode']>);
		executeFunctions.continueOnFail.mockReturnValue(false);
	});

	describe('search', () => {
		let mockBind: jest.Mock;
		let mockSearch: jest.Mock;
		let mockUnbind: jest.Mock;

		beforeEach(() => {
			mockBind = jest.fn().mockResolvedValue(undefined);
			mockSearch = jest.fn().mockResolvedValue({ searchEntries: [] });
			mockUnbind = jest.fn().mockResolvedValue(undefined);

			const mockClient = {
				bind: mockBind,
				search: mockSearch,
				unbind: mockUnbind,
			};

			jest.spyOn(Helpers, 'createLdapClient').mockResolvedValue(mockClient as unknown as Client);

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
	});
});
