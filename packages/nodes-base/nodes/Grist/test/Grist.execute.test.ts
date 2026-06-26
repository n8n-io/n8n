import type { IExecuteFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { Grist } from '../Grist.node';

describe('Grist execute (v2 resourceMapper)', () => {
	const setup = (params: Record<string, unknown>) => {
		const request = vi.fn().mockResolvedValue({ records: [{ id: 7 }] });

		const execFns = mock<IExecuteFunctions>();
		execFns.helpers = {
			...execFns.helpers,
			request,
			returnJsonArray: (data) => (Array.isArray(data) ? data : [data]).map((json) => ({ json })),
			constructExecutionMetaData: (data) => data as never,
		};
		execFns.getInputData.mockReturnValue([{ json: {} }]);
		execFns.getNode.mockReturnValue({ typeVersion: 2 } as ReturnType<IExecuteFunctions['getNode']>);
		execFns.continueOnFail.mockReturnValue(false);
		execFns.getCredentials.mockResolvedValue({
			apiKey: 'key',
			url: 'https://api.getgrist.com',
		});

		const allParams: Record<string, unknown> = {
			authentication: 'apiKey',
			docId: 'doc1',
			tableId: 'Table1',
			...params,
		};
		(execFns.getNodeParameter as unknown as Mock).mockImplementation(
			(name: string, _i?: number, fallback?: unknown) =>
				name in allParams ? allParams[name] : fallback,
		);

		return { execFns, request };
	};

	it('create posts the mapped column values', async () => {
		const { execFns, request } = setup({
			operation: 'create',
			'columns.value': { Name: 'Ada', Age: 36 },
		});

		await new Grist().execute.call(execFns);

		const options = request.mock.calls[0][0];
		expect(options.method).toBe('POST');
		expect(options.uri).toBe('https://api.getgrist.com/api/docs/doc1/tables/Table1/records');
		expect(options.body).toEqual({ records: [{ fields: { Name: 'Ada', Age: 36 } }] });
	});

	it('update patches the mapped column values for the given row ID', async () => {
		const { execFns, request } = setup({
			operation: 'update',
			rowId: '7',
			'columns.value': { Name: 'Grace' },
		});

		await new Grist().execute.call(execFns);

		const options = request.mock.calls[0][0];
		expect(options.method).toBe('PATCH');
		expect(options.body).toEqual({ records: [{ id: 7, fields: { Name: 'Grace' } }] });
	});

	it('delete posts the row IDs and returns a deleted confirmation', async () => {
		const { execFns, request } = setup({ operation: 'delete', rowId: '7, 8' });

		const result = await new Grist().execute.call(execFns);

		const options = request.mock.calls[0][0];
		expect(options.method).toBe('POST');
		expect(options.uri).toBe('https://api.getgrist.com/api/docs/doc1/tables/Table1/data/delete');
		expect(options.body).toEqual([7, 8]);
		// `deleted` is the convention; `success` is kept for backward compatibility.
		expect(result[0][0].json).toEqual({ deleted: true, success: true });
	});

	it('upsert throws when no matching column is selected (avoids an empty match clause)', async () => {
		const { execFns, request } = setup({
			operation: 'upsert',
			'columns.value': { Email: 'a@b.c' },
			'columns.matchingColumns': [],
		});

		await expect(new Grist().execute.call(execFns)).rejects.toThrow(/match on/i);
		expect(request).not.toHaveBeenCalled();
	});

	it('upsert puts require (from matching columns) plus full fields', async () => {
		const { execFns, request } = setup({
			operation: 'upsert',
			'columns.value': { Email: 'a@b.c', Name: 'Ada' },
			'columns.matchingColumns': ['Email'],
		});

		await new Grist().execute.call(execFns);

		const options = request.mock.calls[0][0];
		expect(options.method).toBe('PUT');
		expect(options.uri).toBe('https://api.getgrist.com/api/docs/doc1/tables/Table1/records');
		expect(options.body).toEqual({
			records: [{ require: { Email: 'a@b.c' }, fields: { Email: 'a@b.c', Name: 'Ada' } }],
		});
	});
});
