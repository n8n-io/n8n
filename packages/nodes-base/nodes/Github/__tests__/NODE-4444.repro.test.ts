/**
 * Regression test for NODE-4444: GitHub node branch selector is broken
 *
 * Issue: Dynamically-loaded dropdown selectors (branch, repository, workflow, owner)
 * open but never resolve - they remain stuck in a skeleton/loading state.
 *
 * Root Cause: When a resourceLocator field is in 'list' mode but no value has been
 * selected yet, `getCurrentNodeParameter` with `{ extractValue: true }` returns an
 * empty string ''. This empty string is then used in API calls to fetch dependent
 * dropdowns (e.g., repositories, workflows, branches), causing those API calls to
 * fail silently (caught in try-catch blocks), resulting in empty dropdown lists
 * that never populate.
 *
 * The issue manifests as a circular dependency:
 * 1. User opens workflow dropdown → needs owner & repository
 * 2. getWorkflows calls getCurrentNodeParameter('owner') → returns '' (empty)
 * 3. API call to /repos//repository/actions/workflows fails
 * 4. Empty results returned → dropdown shows loading skeleton forever
 *
 * Expected behavior: The function should either:
 * - Return undefined/null when no value is selected
 * - Throw a clear error indicating missing required parameter
 * - Check for empty values before making API calls
 */

import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getUsers, getRepositories, getWorkflows, getRefs } from '../SearchFunctions';

describe('NODE-4444: GitHub node branch selector regression', () => {
	let mockLoadOptionsFunctions: ILoadOptionsFunctions;

	beforeEach(() => {
		mockLoadOptionsFunctions = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn().mockResolvedValue({
				server: 'https://api.github.com',
			}),
			helpers: {
				requestWithAuthentication: jest.fn(),
			},
			getCurrentNodeParameter: jest.fn(),
		} as unknown as ILoadOptionsFunctions;
	});

	describe('getWorkflows - workflow selector', () => {
		it('should fail when getCurrentNodeParameter returns empty string for owner', async () => {
			// This is the actual bug: when a resourceLocator is in 'list' mode with no value selected,
			// getCurrentNodeParameter with { extractValue: true } returns '' instead of undefined
			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock)
				.mockReturnValueOnce('') // owner returns empty string (the bug!)
				.mockReturnValueOnce('test-repo');

			// Mock the API call to throw an error (simulating 404 or similar)
			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				new Error('Not Found'),
			);

			const result = await getWorkflows.call(mockLoadOptionsFunctions);

			// API endpoint becomes /repos//test-repo/actions/workflows which fails
			// The try-catch swallows the error and returns empty results
			expect(result.results).toEqual([]);
		});

		it('should fail when getCurrentNodeParameter returns empty string for repository', async () => {
			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock)
				.mockReturnValueOnce('test-owner')
				.mockReturnValueOnce(''); // repository returns empty string

			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				new Error('Not Found'),
			);

			const result = await getWorkflows.call(mockLoadOptionsFunctions);

			// API endpoint becomes /repos/test-owner//actions/workflows which fails
			expect(result.results).toEqual([]);
		});

		it('should fail when both owner and repository are empty strings', async () => {
			// Simulates opening the workflow dropdown before selecting owner or repository
			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock)
				.mockReturnValueOnce('') // owner empty
				.mockReturnValueOnce(''); // repository empty

			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				new Error('Not Found'),
			);

			const result = await getWorkflows.call(mockLoadOptionsFunctions);

			// API endpoint becomes /repos///actions/workflows which definitely fails
			expect(result.results).toEqual([]);
		});
	});

	describe('getRefs - branch selector', () => {
		it('should fail when getCurrentNodeParameter returns empty string for owner', async () => {
			// Branch selector depends on both owner and repository being populated
			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock)
				.mockReturnValueOnce('') // owner empty
				.mockReturnValueOnce('test-repo');

			// Note: getRefs doesn't have try-catch, so it will throw
			await expect(getRefs.call(mockLoadOptionsFunctions)).rejects.toThrow();
		});

		it('should fail when getCurrentNodeParameter returns empty string for repository', async () => {
			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock)
				.mockReturnValueOnce('test-owner')
				.mockReturnValueOnce(''); // repository empty

			// API call to /repos/test-owner//git/refs will fail
			await expect(getRefs.call(mockLoadOptionsFunctions)).rejects.toThrow();
		});

		it('should fail when both owner and repository are empty strings', async () => {
			// Simulates opening the branch dropdown before selecting owner or repository
			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock)
				.mockReturnValueOnce('') // owner empty
				.mockReturnValueOnce(''); // repository empty

			// API call to /repos///git/refs will fail
			await expect(getRefs.call(mockLoadOptionsFunctions)).rejects.toThrow();
		});
	});

	describe('getRepositories - repository selector', () => {
		it('should fail when getCurrentNodeParameter returns empty string for owner', async () => {
			// Repository selector depends on owner being selected first
			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock).mockReturnValueOnce('');

			// Mock API to reject due to invalid query
			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				new Error('Validation Failed'),
			);

			const result = await getRepositories.call(mockLoadOptionsFunctions);

			// Search query becomes: " user: fork:true" which returns no results
			// The try-catch catches the error and returns empty results
			expect(result.results).toEqual([]);
		});

		it('should handle filter with empty owner gracefully', async () => {
			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock).mockReturnValueOnce('');

			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				new Error('Validation Failed'),
			);

			const result = await getRepositories.call(mockLoadOptionsFunctions, 'test-filter');

			// Search query becomes: "test-filter user: fork:true"
			// Still invalid due to empty owner
			expect(result.results).toEqual([]);
		});
	});

	describe('getUsers - user/owner selector', () => {
		it('should still work even with no dependencies on getCurrentNodeParameter', async () => {
			// getUsers doesn't depend on getCurrentNodeParameter, so it should work
			const responseData = {
				items: [{ login: 'user1', html_url: 'https://github.com/user1' }],
				total_count: 1,
			};

			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValue(
				responseData,
			);

			const result = await getUsers.call(mockLoadOptionsFunctions, 'test');

			expect(result.results).toHaveLength(1);
		});
	});

	describe('Integration scenario - typical workflow dispatch setup', () => {
		it('should demonstrate the cascade failure when no owner is selected', async () => {
			// Simulates the real-world scenario described in the bug report:
			// User opens GitHub node, sets operation to "Dispatch", and tries to use dropdowns

			// All resourceLocators start in 'list' mode with empty value
			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock).mockReturnValue('');

			// Step 1: Try to load owners - getUsers doesn't depend on other parameters, so it works
			const usersResponseData = {
				items: [{ login: 'user1', html_url: 'https://github.com/user1' }],
				total_count: 1,
			};
			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValueOnce(
				usersResponseData,
			);
			const ownerResult = await getUsers.call(mockLoadOptionsFunctions, 'test');
			expect(ownerResult.results).toHaveLength(1); // Owner dropdown works

			// Step 2: User clicks "Repository Name (From list)" before selecting owner
			// getCurrentNodeParameter('owner') returns '' because no owner selected yet
			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValueOnce(
				new Error('Validation Failed'),
			);
			const repoResult = await getRepositories.call(mockLoadOptionsFunctions);
			expect(repoResult.results).toEqual([]); // Repository dropdown stuck loading!

			// Step 3: User clicks "Workflow" dropdown before selecting owner/repository
			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValueOnce(
				new Error('Not Found'),
			);
			const workflowResult = await getWorkflows.call(mockLoadOptionsFunctions);
			expect(workflowResult.results).toEqual([]); // Workflow dropdown stuck loading!

			// Step 4: User clicks "Branch" dropdown before selecting owner/repository
			// getRefs will throw because it doesn't have try-catch protection
			await expect(getRefs.call(mockLoadOptionsFunctions)).rejects.toThrow();
		});

		it('should demonstrate cascade failure even after owner is selected', async () => {
			// Simulates: User has selected owner, but repository is still empty
			(mockLoadOptionsFunctions.getCurrentNodeParameter as jest.Mock).mockImplementation(
				(param: string) => {
					if (param === 'owner') return 'selected-owner'; // Owner selected
					if (param === 'repository') return ''; // Repository not selected yet
					return '';
				},
			);

			// Step 1: Repository dropdown should now work (owner is selected)
			const reposResponseData = {
				items: [{ name: 'repo1', html_url: 'https://github.com/owner/repo1' }],
				total_count: 1,
			};
			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockResolvedValueOnce(
				reposResponseData,
			);
			const repoResult = await getRepositories.call(mockLoadOptionsFunctions);
			expect(repoResult.results).toHaveLength(1); // Works now!

			// Step 2: But workflow dropdown still fails (repository empty)
			(mockLoadOptionsFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValueOnce(
				new Error('Not Found'),
			);
			const workflowResult = await getWorkflows.call(mockLoadOptionsFunctions);
			expect(workflowResult.results).toEqual([]); // Still stuck!

			// Step 3: Branch dropdown also fails (repository empty)
			await expect(getRefs.call(mockLoadOptionsFunctions)).rejects.toThrow();
		});
	});
});
