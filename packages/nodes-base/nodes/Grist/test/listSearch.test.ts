import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { searchDocs, searchTables } from '../GenericFunctions';

// Emulate n8n's load-options getNodeParameter: signature is (name, fallback?, options?) — NO item
// index — and `extractValue` pulls `.value` out of a resource-locator object. This catches the
// context-specific signature bug: an exec-style call (name, itemIndex, fallback, options) lands the
// options in the wrong slot, extractValue is dropped, and the raw locator object leaks through.
const setup = (params: Record<string, unknown>, request: Mock) => {
	const loadOptions = mock<ILoadOptionsFunctions>();
	loadOptions.helpers = { ...loadOptions.helpers, request };
	loadOptions.getCredentials.mockResolvedValue({ apiKey: 'key', url: 'https://api.getgrist.com' });
	(loadOptions.getNodeParameter as unknown as Mock).mockImplementation(
		(name: string, fallback?: unknown, options?: { extractValue?: boolean }) => {
			const value = name in params ? params[name] : fallback;
			if (options?.extractValue && value && typeof value === 'object' && '__rl' in value) {
				return (value as Record<string, unknown>).value;
			}
			return value;
		},
	);
	return loadOptions;
};

describe('Grist searchDocs', () => {
	const run = async (filter?: string) => {
		// First call: /orgs, then one /orgs/{id}/workspaces call per org.
		const request = vi
			.fn()
			.mockResolvedValueOnce([{ id: 1 }, { id: 2 }])
			.mockResolvedValueOnce([
				{
					docs: [
						{ id: 'docZ', name: 'Zebra' },
						{ id: 'docA', name: 'Apple' },
					],
				},
			])
			.mockResolvedValueOnce([{ docs: [{ id: 'docM', name: 'Mango' }] }]);

		const loadOptions = setup({ authentication: 'apiKey' }, request);
		const result = await searchDocs.call(loadOptions, filter);
		return { result, request };
	};

	it('walks every org/workspace and returns docs sorted by name', async () => {
		const { result, request } = await run();

		// /orgs + /orgs/1/workspaces + /orgs/2/workspaces
		expect(request).toHaveBeenCalledTimes(3);
		expect(result.results).toEqual([
			{ name: 'Apple', value: 'docA' },
			{ name: 'Mango', value: 'docM' },
			{ name: 'Zebra', value: 'docZ' },
		]);
	});

	it('filters results by the search term (case-insensitive)', async () => {
		const { result } = await run('app');
		expect(result.results).toEqual([{ name: 'Apple', value: 'docA' }]);
	});
});

describe('Grist searchTables', () => {
	it('extracts the doc ID from the resource locator and lists its tables', async () => {
		const request = vi.fn().mockResolvedValue({ tables: [{ id: 'People' }, { id: 'Orders' }] });
		// docId arrives as a resource-locator object, as it does from a "From List" selection.
		const docId = { __rl: true, mode: 'list', value: 'doc1', cachedResultName: 'My Doc' };
		const loadOptions = setup({ authentication: 'apiKey', docId }, request);

		const result = await searchTables.call(loadOptions);

		// The request must target the extracted ID (doc1), not the locator object — guards the
		// load-options getNodeParameter signature (no item index, extractValue honored).
		expect(loadOptions.getNodeParameter).toHaveBeenCalledWith('docId', undefined, {
			extractValue: true,
		});
		expect(request.mock.calls[0][0].uri).toBe('https://api.getgrist.com/api/docs/doc1/tables');
		expect(result.results).toEqual([
			{ name: 'People', value: 'People' },
			{ name: 'Orders', value: 'Orders' },
		]);
	});

	it('accepts a legacy plain-string doc ID (v1 workflows)', async () => {
		const request = vi.fn().mockResolvedValue({ tables: [{ id: 'People' }] });
		// Workflows created before resource locators stored docId as a plain string, not a locator.
		const loadOptions = setup({ authentication: 'apiKey', docId: 'doc1' }, request);

		const result = await searchTables.call(loadOptions);

		expect(request.mock.calls[0][0].uri).toBe('https://api.getgrist.com/api/docs/doc1/tables');
		expect(result.results).toEqual([{ name: 'People', value: 'People' }]);
	});

	it('returns nothing and makes no request when no document is selected', async () => {
		const request = vi.fn();
		const loadOptions = setup({ authentication: 'apiKey', docId: '' }, request);

		const result = await searchTables.call(loadOptions);

		expect(result.results).toEqual([]);
		expect(request).not.toHaveBeenCalled();
	});
});
