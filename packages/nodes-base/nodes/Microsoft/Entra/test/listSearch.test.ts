import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { getGroups, getUsers } from '../GenericFunctions';

describe('Microsoft Entra listSearch', () => {
	let mockLoadOptionsFunctions: Mocked<ILoadOptionsFunctions>;
	let mockRequest: Mock;

	beforeEach(() => {
		mockLoadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		mockRequest = vi.fn().mockResolvedValue({ value: [] });
		mockLoadOptionsFunctions.helpers.requestWithAuthentication = mockRequest;
		mockLoadOptionsFunctions.getCredentials = vi
			.fn()
			.mockResolvedValue({}) as unknown as typeof mockLoadOptionsFunctions.getCredentials;
	});

	const sentQuerystring = () => mockRequest.mock.calls[0][1].qs;

	describe('getUsers', () => {
		it('builds an OData filter from the search term', async () => {
			await getUsers.call(mockLoadOptionsFunctions, 'Jane');

			expect(sentQuerystring().$filter).toBe(
				"startsWith(displayName, 'Jane') OR startsWith(userPrincipalName, 'Jane')",
			);
		});

		it('keeps quotes in the search term inside the OData literal', async () => {
			await getUsers.call(mockLoadOptionsFunctions, "a'b");

			expect(sentQuerystring().$filter).toBe(
				"startsWith(displayName, 'a''b') OR startsWith(userPrincipalName, 'a''b')",
			);
		});

		it('sends no filter when the search term is empty', async () => {
			await getUsers.call(mockLoadOptionsFunctions);

			expect(sentQuerystring().$filter).toBeUndefined();
		});
	});

	describe('getGroups', () => {
		it('builds a search phrase from the search term', async () => {
			await getGroups.call(mockLoadOptionsFunctions, 'Sales');

			expect(sentQuerystring().$search).toBe('"displayName:Sales"');
		});

		it('escapes a trailing backslash before the quote it would otherwise consume', async () => {
			await getGroups.call(mockLoadOptionsFunctions, 'a\\"b');

			expect(sentQuerystring().$search).toBe('"displayName:a\\\\\\"b"');
		});

		it('keeps quotes in the search term inside the search phrase', async () => {
			await getGroups.call(mockLoadOptionsFunctions, 'a"b');

			expect(sentQuerystring().$search).toBe('"displayName:a\\"b"');
		});
	});
});
