import type { ILoadOptionsFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { getMappingColumns } from '../GenericFunctions';

describe('Grist getMappingColumns', () => {
	const run = async (columns: unknown) => {
		const request = vi.fn().mockResolvedValue({ columns });

		const loadOptions = mock<ILoadOptionsFunctions>();
		loadOptions.helpers = { ...loadOptions.helpers, request };
		loadOptions.getCredentials.mockResolvedValue({
			apiKey: 'key',
			url: 'https://api.getgrist.com',
		});

		const params: Record<string, unknown> = {
			authentication: 'apiKey',
			docId: 'doc1',
			tableId: 'Table1',
		};
		(loadOptions.getNodeParameter as unknown as Mock).mockImplementation(
			(name: string) => params[name],
		);

		const result = await getMappingColumns.call(loadOptions);
		return { result, request };
	};

	it('requests the columns of the configured doc/table', async () => {
		const { request } = await run([]);

		expect(request.mock.calls[0][0].uri).toBe(
			'https://api.getgrist.com/api/docs/doc1/tables/Table1/columns',
		);
	});

	it('uses the column label as the display name, falling back to the id', async () => {
		const { result } = await run([
			{ id: 'Name', fields: { label: 'Full Name', type: 'Text' } },
			{ id: 'NoLabel', fields: { type: 'Text' } },
		]);

		expect(result.fields[0]).toMatchObject({ id: 'Name', displayName: 'Full Name' });
		expect(result.fields[1]).toMatchObject({ id: 'NoLabel', displayName: 'NoLabel' });
	});

	it('maps Grist column types (including suffixed ones) to resourceMapper field types', async () => {
		const { result } = await run([
			{ id: 'aText', fields: { type: 'Text' } },
			{ id: 'aNumeric', fields: { type: 'Numeric' } },
			{ id: 'anInt', fields: { type: 'Int' } },
			{ id: 'aBool', fields: { type: 'Bool' } },
			{ id: 'aDate', fields: { type: 'Date' } },
			{ id: 'aDateTime', fields: { type: 'DateTime:UTC' } },
			{ id: 'aChoice', fields: { type: 'Choice' } },
			{ id: 'aChoiceList', fields: { type: 'ChoiceList' } },
			{ id: 'aRefList', fields: { type: 'RefList:Other' } },
			{ id: 'attachments', fields: { type: 'Attachments' } },
			{ id: 'aRef', fields: { type: 'Ref:Other' } },
			{ id: 'anAny', fields: { type: 'Any' } },
			{ id: 'noType', fields: {} },
		]);

		const byId = Object.fromEntries(result.fields.map((f) => [f.id, f.type]));
		expect(byId).toEqual({
			aText: 'string',
			aNumeric: 'number',
			anInt: 'number',
			aBool: 'boolean',
			aDate: 'dateTime',
			aDateTime: 'dateTime',
			aChoice: 'options',
			aChoiceList: 'array',
			aRefList: 'array',
			attachments: 'array',
			aRef: 'string',
			anAny: 'string',
			noType: 'string',
		});
	});

	it('marks only real formula columns read-only; empty and trigger-formula columns stay writable', async () => {
		const { result } = await run([
			{ id: 'formula', fields: { type: 'Numeric', isFormula: true, formula: '1+1' } },
			// An undecided/empty column reports isFormula:true with an empty formula — must stay writable.
			{ id: 'empty', fields: { type: 'Any', isFormula: true, formula: '' } },
			{ id: 'trigger', fields: { type: 'Numeric', isFormula: false, formula: 'NOW()' } },
			{ id: 'plain', fields: { type: 'Text' } },
		]);

		const byId = Object.fromEntries(result.fields.map((f) => [f.id, f.readOnly]));
		expect(byId).toEqual({ formula: true, empty: false, trigger: false, plain: false });
	});

	it('excludes hidden helper and manualSort columns', async () => {
		const { result } = await run([
			{ id: 'Name', fields: { type: 'Text' } },
			{ id: 'manualSort', fields: { type: 'Numeric' } },
			{ id: 'gristHelper_Display', fields: { type: 'Any' } },
		]);

		expect(result.fields.map((f) => f.id)).toEqual(['Name']);
	});

	it('emits the resourceMapper flags expected for every column', async () => {
		const { result } = await run([{ id: 'Name', fields: { label: 'Name', type: 'Text' } }]);

		expect(result.fields[0]).toEqual({
			id: 'Name',
			displayName: 'Name',
			type: 'string',
			readOnly: false,
			required: false,
			defaultMatch: false,
			display: true,
			canBeUsedToMatch: true,
		});
	});

	it('returns no fields without fetching when no document/table is selected yet', async () => {
		const request = vi.fn();
		const loadOptions = mock<ILoadOptionsFunctions>();
		loadOptions.helpers = { ...loadOptions.helpers, request };
		const params: Record<string, unknown> = { authentication: 'apiKey', docId: '', tableId: '' };
		(loadOptions.getNodeParameter as unknown as Mock).mockImplementation(
			(name: string) => params[name],
		);

		const result = await getMappingColumns.call(loadOptions);

		// hideNoDataError on the field keeps the empty state quiet — no message needed here.
		expect(result.fields).toEqual([]);
		expect(request).not.toHaveBeenCalled();
	});
});
