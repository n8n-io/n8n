import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { lonescaleApiRequest } from '../GenericFunctions';
import { LoneScale } from '../LoneScale.node';

vi.mock('../GenericFunctions', () => ({
	lonescaleApiRequest: vi.fn(),
}));

const mockApiRequest = vi.mocked(lonescaleApiRequest);

/**
 * Builds a minimal IExecuteFunctions mock backed by a flat parameter map.
 * `getNodeParameter` ignores the item index (tests run a single input item)
 * and falls back to the provided default when a parameter is absent.
 */
function createExecuteFunctions(
	params: Record<string, unknown>,
	options: { continueOnFail?: boolean } = {},
): IExecuteFunctions {
	return {
		getInputData: vi.fn(() => [{ json: {} }]),
		continueOnFail: vi.fn(() => options.continueOnFail ?? false),
		getNodeParameter: vi.fn((name: string, _itemIndex?: number, fallback?: unknown) =>
			name in params ? params[name] : fallback,
		),
		getNode: vi.fn(() => ({ name: 'LoneScale' })),
		helpers: {
			returnJsonArray: vi.fn((data: IDataObject | IDataObject[]) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
			),
			constructExecutionMetaData: vi.fn((executionData: INodeExecutionData[]) => executionData),
		},
	} as unknown as IExecuteFunctions;
}

describe('LoneScale Node', () => {
	beforeEach(() => {
		mockApiRequest.mockReset();
	});

	describe('contact: enrich', () => {
		const baseParams = {
			resource: 'contact',
			operation: 'enrich',
			enrichmentType: ['email', 'profile'],
			firstName: 'Tim',
			lastName: 'Cook',
			enrichCompanyName: 'Apple',
			enrichCompanyDomain: 'apple.com',
			detectJobChange: true,
			enrichAdditionalFields: {
				email: 'tim@apple.com',
				jobTitle: 'CEO',
				linkedinUrl: 'https://www.linkedin.com/in/tim',
				contactId: 'crm-123',
			},
		};

		it('posts a fully-mapped contact and returns the enriched contacts', async () => {
			const enriched = { firstname: 'Tim', lastname: 'Cook', email: 'tim@apple.com' };
			mockApiRequest.mockResolvedValue({ contacts: [enriched] });

			const ctx = createExecuteFunctions(baseParams);
			const result = await new LoneScale().execute.call(ctx);

			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/trigger/enrich/sync', {
				enrichment_type: ['email', 'profile'],
				detect_job_change: true,
				contacts: [
					{
						firstname: 'Tim',
						lastname: 'Cook',
						company_name: 'Apple',
						domain: 'apple.com',
						email: 'tim@apple.com',
						job_title: 'CEO',
						linkedin_url: 'https://www.linkedin.com/in/tim',
						custom: { contact_id: 'crm-123' },
					},
				],
			});
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual(enriched);
		});

		it('omits optional fields and detect_job_change when not provided', async () => {
			mockApiRequest.mockResolvedValue({ contacts: [] });

			const ctx = createExecuteFunctions({
				resource: 'contact',
				operation: 'enrich',
				enrichmentType: ['email'],
				firstName: 'Tim',
				lastName: 'Cook',
				enrichCompanyName: '',
				enrichCompanyDomain: '',
				detectJobChange: false,
				enrichAdditionalFields: {},
			});
			await new LoneScale().execute.call(ctx);

			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/trigger/enrich/sync', {
				enrichment_type: ['email'],
				contacts: [{ firstname: 'Tim', lastname: 'Cook' }],
			});
		});

		it('returns an empty array when the response has no contacts', async () => {
			mockApiRequest.mockResolvedValue({});

			const ctx = createExecuteFunctions(baseParams);
			const result = await new LoneScale().execute.call(ctx);

			expect(result[0]).toHaveLength(0);
		});
	});

	describe('contact: source', () => {
		const baseParams = {
			resource: 'contact',
			operation: 'source',
			sourceCompanyDomain: 'stripe.com',
			sourceCompanyName: '',
			sourceCompanyLinkedinUrl: '',
			personas: {
				persona: [
					{
						name: 'Sales',
						jobTitles: 'Head of Sales, VP Sales',
						excludeJobTitles: 'Intern, Assistant',
					},
				],
			},
			sourceAdditionalFields: {
				maxResults: 5,
				includedLocations: 'US, FR',
				seniorityLevels: ['c-suite'],
				disableCompanyInfo: true,
			},
		};

		it('maps personas and filters into the request body', async () => {
			const contact = { lonescale_full_name: 'Jane Doe', lonescale_job_title: 'Head of Sales' };
			mockApiRequest.mockResolvedValue({ contacts: [contact], profiles_found: 1 });

			const ctx = createExecuteFunctions(baseParams);
			const result = await new LoneScale().execute.call(ctx);

			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/trigger/contact-sourcing/sync', {
				company_domain: 'stripe.com',
				personas: [
					{
						name: 'Sales',
						job_titles: ['Head of Sales', 'VP Sales'],
						exclude_job_titles: ['Intern', 'Assistant'],
					},
				],
				limit: 5,
				included_locations: ['US', 'FR'],
				seniority_levels: ['c-suite'],
				disable_company_info: true,
			});
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual(contact);
		});

		it('omits exclude_job_titles and optional filters when empty', async () => {
			mockApiRequest.mockResolvedValue({ contacts: [] });

			const ctx = createExecuteFunctions({
				resource: 'contact',
				operation: 'source',
				sourceCompanyDomain: 'stripe.com',
				sourceCompanyName: '',
				sourceCompanyLinkedinUrl: '',
				personas: {
					persona: [{ name: 'Sales', jobTitles: 'Head of Sales', excludeJobTitles: '' }],
				},
				sourceAdditionalFields: {},
			});
			await new LoneScale().execute.call(ctx);

			expect(mockApiRequest).toHaveBeenCalledWith('POST', '/trigger/contact-sourcing/sync', {
				company_domain: 'stripe.com',
				personas: [{ name: 'Sales', job_titles: ['Head of Sales'] }],
			});
		});

		it('returns an empty array when the response has no contacts', async () => {
			mockApiRequest.mockResolvedValue({ profiles_found: 0 });

			const ctx = createExecuteFunctions(baseParams);
			const result = await new LoneScale().execute.call(ctx);

			expect(result[0]).toHaveLength(0);
		});
	});

	describe('company: search', () => {
		const baseParams = {
			resource: 'company',
			operation: 'search',
			searchDomain: 'stripe.com',
			searchLinkedinId: '',
			searchSlug: '',
			searchName: '',
			searchEnrich: true,
		};

		it('builds the query string and returns the results', async () => {
			const company = { name: 'Stripe', domain: 'stripe.com' };
			mockApiRequest.mockResolvedValue({ results: [company], count: 1, custom: {} });

			const ctx = createExecuteFunctions(baseParams);
			const result = await new LoneScale().execute.call(ctx);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'GET',
				'/companies/search',
				{},
				{ domain: 'stripe.com', enrich: true },
			);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual(company);
		});

		it('only sends the identifiers that are provided', async () => {
			mockApiRequest.mockResolvedValue({ results: [] });

			const ctx = createExecuteFunctions({
				resource: 'company',
				operation: 'search',
				searchDomain: '',
				searchLinkedinId: '',
				searchSlug: 'stripe',
				searchName: '',
				searchEnrich: false,
			});
			await new LoneScale().execute.call(ctx);

			expect(mockApiRequest).toHaveBeenCalledWith(
				'GET',
				'/companies/search',
				{},
				{ slug: 'stripe' },
			);
		});

		it('returns an empty array when the response has no results', async () => {
			mockApiRequest.mockResolvedValue({ count: 0, custom: {} });

			const ctx = createExecuteFunctions(baseParams);
			const result = await new LoneScale().execute.call(ctx);

			expect(result[0]).toHaveLength(0);
		});
	});

	describe('validation', () => {
		it('throws when source is given no company identifier', async () => {
			const ctx = createExecuteFunctions({
				resource: 'contact',
				operation: 'source',
				sourceCompanyDomain: '',
				sourceCompanyName: '',
				sourceCompanyLinkedinUrl: '',
				personas: {
					persona: [{ name: 'Sales', jobTitles: 'Head of Sales', excludeJobTitles: '' }],
				},
				sourceAdditionalFields: {},
			});

			await expect(new LoneScale().execute.call(ctx)).rejects.toThrow(
				'Provide at least one company identifier: domain, name or Linkedin URL',
			);
			expect(mockApiRequest).not.toHaveBeenCalled();
		});

		it('throws when search is given no company identifier', async () => {
			const ctx = createExecuteFunctions({
				resource: 'company',
				operation: 'search',
				searchDomain: '',
				searchLinkedinId: '',
				searchSlug: '',
				searchName: '',
				searchEnrich: false,
			});

			await expect(new LoneScale().execute.call(ctx)).rejects.toThrow(
				'Provide at least one company identifier: domain, Linkedin ID, slug or name',
			);
			expect(mockApiRequest).not.toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		it('rethrows API errors when continueOnFail is off', async () => {
			mockApiRequest.mockRejectedValue(
				new NodeOperationError({ name: 'LoneScale' } as never, 'boom'),
			);

			const ctx = createExecuteFunctions(
				{
					resource: 'company',
					operation: 'search',
					searchDomain: 'stripe.com',
					searchLinkedinId: '',
					searchSlug: '',
					searchName: '',
					searchEnrich: false,
				},
				{ continueOnFail: false },
			);

			await expect(new LoneScale().execute.call(ctx)).rejects.toThrow('boom');
		});

		it('returns the error on the item when continueOnFail is on', async () => {
			mockApiRequest.mockRejectedValue(new Error('rate limited'));

			const ctx = createExecuteFunctions(
				{
					resource: 'contact',
					operation: 'enrich',
					enrichmentType: ['email'],
					firstName: 'Tim',
					lastName: 'Cook',
					enrichCompanyName: '',
					enrichCompanyDomain: '',
					detectJobChange: false,
					enrichAdditionalFields: {},
				},
				{ continueOnFail: true },
			);

			const result = await new LoneScale().execute.call(ctx);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ error: 'rate limited' });
		});
	});
});
