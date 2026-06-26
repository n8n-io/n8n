import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { getReadyColumns, getTableColumns } from '../GenericFunctions';

describe('Grist column option lists', () => {
	const run = async (
		method: typeof getTableColumns | typeof getReadyColumns,
		columns: unknown,
		params: Record<string, unknown> = { docId: 'doc1', tableId: 'Table1' },
	) => {
		const request = vi.fn().mockResolvedValue({ columns });
		const loadOptions = mock<ILoadOptionsFunctions>();
		loadOptions.helpers = { ...loadOptions.helpers, request };
		loadOptions.getCredentials.mockResolvedValue({
			apiKey: 'key',
			url: 'https://api.getgrist.com',
		});
		(loadOptions.getNodeParameter as unknown as Mock).mockImplementation(
			(name: string) => ({ authentication: 'apiKey', ...params })[name],
		);

		const result = await method.call(loadOptions);
		return { result, request };
	};

	describe('getTableColumns', () => {
		it('labels each column by its display name, falling back to the id (value stays the id)', async () => {
			const { result } = await run(getTableColumns, [
				{ id: 'FullName', fields: { label: 'Full Name', type: 'Text' } },
				{ id: 'NoLabel', fields: { type: 'Text' } },
			]);

			expect(result).toEqual([
				{ name: 'Full Name', value: 'FullName' },
				{ name: 'NoLabel', value: 'NoLabel' },
			]);
		});

		it('returns nothing and makes no request until a doc/table is selected', async () => {
			const { result, request } = await run(getTableColumns, [], { docId: '', tableId: '' });

			expect(result).toEqual([]);
			expect(request).not.toHaveBeenCalled();
		});
	});

	describe('getReadyColumns', () => {
		it('keeps only Bool/Any columns (a readiness toggle), labelled, excluding helpers', async () => {
			const { result } = await run(getReadyColumns, [
				{ id: 'IsReady', fields: { label: 'Is Ready', type: 'Bool' } },
				{ id: 'Anything', fields: { type: 'Any' } },
				{ id: 'Name', fields: { label: 'Name', type: 'Text' } },
				{ id: 'Age', fields: { type: 'Int' } },
				{ id: 'gristHelper_x', fields: { type: 'Any' } },
			]);

			expect(result).toEqual([
				{ name: 'Is Ready', value: 'IsReady' },
				{ name: 'Anything', value: 'Anything' },
			]);
		});
	});
});
