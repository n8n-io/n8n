import { mock } from 'vitest-mock-extended';
import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';

import { QuickBase } from '../QuickBase.node';

describe('QuickBase', () => {
	const node = new QuickBase();

	function setup(params: IDataObject, perItem: IDataObject[] = [{}]) {
		const ctx = mock<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue(perItem.map(() => ({ json: {} })));
		ctx.getNode.mockReturnValue(mock<INode>({ name: 'Quick Base' }));
		ctx.getCredentials.mockResolvedValue({ hostname: 'demo.quickbase.com', userToken: 'token' });
		ctx.getNodeParameter.mockImplementation((name: string, i: number, fallback?: unknown) => {
			const values = { ...params, ...perItem[i] };
			return (name in values ? values[name] : fallback) as never;
		});
		const request = vi.fn().mockResolvedValue({ numberDeleted: 1, data: [], fields: [] });
		ctx.helpers = {
			request,
			returnJsonArray: (data: IDataObject | IDataObject[]) =>
				(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
			constructExecutionMetaData: (data: unknown) => data,
		} as unknown as IExecuteFunctions['helpers'];
		return { ctx, request };
	}

	const sentBody = (request: ReturnType<typeof setup>['request']) =>
		(request.mock.calls[0][0] as IDataObject).body as IDataObject;

	describe('record:delete', () => {
		const base = { resource: 'record', operation: 'delete', tableId: 'bck7gp3q2' };

		it('should send the where filter unchanged when no parameters are set', async () => {
			const { ctx, request } = setup({ ...base, where: "{6.EX.'alice@example.com'}" });

			await node.execute.call(ctx);

			expect(sentBody(request)).toEqual({ from: 'bck7gp3q2', where: "{6.EX.'alice@example.com'}" });
		});

		it('should insert where parameters into the filter', async () => {
			const { ctx, request } = setup({
				...base,
				where: "{6.EX.'$1'}AND{7.EX.'$2'}",
				'whereParameters.values': [{ value: 'alice@example.com' }, { value: 42 }],
			});

			await node.execute.call(ctx);

			expect(sentBody(request).where).toBe("{6.EX.'alice@example.com'}AND{7.EX.'42'}");
		});

		it.each([
			['a single quote', "O'Brien"],
			['a double quote', 'a"b'],
			['an opening brace', 'a{b'],
			['a closing brace', 'a}b'],
		])('should reject a where parameter that contains %s', async (_label, value) => {
			const { ctx, request } = setup({
				...base,
				where: "{6.EX.'$1'}",
				'whereParameters.values': [{ value }],
			});

			await expect(node.execute.call(ctx)).rejects.toThrow("'Where Parameters' cannot contain");
			expect(request).not.toHaveBeenCalled();
		});

		it('should check the where parameters of all items before it deletes records', async () => {
			const { ctx, request } = setup({ ...base, where: "{6.EX.'$1'}" }, [
				{ 'whereParameters.values': [{ value: 'alice@example.com' }] },
				{ 'whereParameters.values': [{ value: "O'Brien" }] },
			]);

			await expect(node.execute.call(ctx)).rejects.toThrow("'Where Parameters' cannot contain");
			expect(request).not.toHaveBeenCalled();
		});

		it('should send an empty where filter unchanged when parameters are set', async () => {
			const { ctx, request } = setup({
				...base,
				where: undefined,
				'whereParameters.values': [{ value: 'a' }],
			});

			await node.execute.call(ctx);

			expect(sentBody(request)).toEqual({ from: 'bck7gp3q2', where: undefined });
		});

		it('should leave $N unchanged when no parameters are set', async () => {
			const { ctx, request } = setup({ ...base, where: "{7.EX.'$5'}" });

			await node.execute.call(ctx);

			expect(sentBody(request).where).toBe("{7.EX.'$5'}");
		});

		it('should not substitute placeholders inside a parameter value', async () => {
			const { ctx, request } = setup({
				...base,
				where: "{6.EX.'$1'}AND{7.EX.'$2'}",
				'whereParameters.values': [{ value: '$2' }, { value: 'b' }],
			});

			await node.execute.call(ctx);

			expect(sentBody(request).where).toBe("{6.EX.'$2'}AND{7.EX.'b'}");
		});

		it('should reject a reference to a parameter that does not exist', async () => {
			const { ctx, request } = setup({
				...base,
				where: "{6.EX.'$3'}",
				'whereParameters.values': [{ value: 'a' }, { value: 'b' }],
			});

			await expect(node.execute.call(ctx)).rejects.toThrow(
				"'Where' references parameter $3, but only 2 parameter(s) were provided",
			);
			expect(request).not.toHaveBeenCalled();
		});
	});

	describe('record:getAll', () => {
		const base = {
			resource: 'record',
			operation: 'getAll',
			tableId: 'bck7gp3q2',
			returnAll: false,
			limit: 50,
		};

		it('should insert where parameters into the filter', async () => {
			const { ctx, request } = setup({
				...base,
				options: {
					where: "{6.EX.'$1'}",
					whereParameters: { values: [{ value: 'alice@example.com' }] },
				},
			});

			await node.execute.call(ctx);

			expect(sentBody(request)).toEqual({
				from: 'bck7gp3q2',
				where: "{6.EX.'alice@example.com'}",
				options: { top: 50 },
			});
		});

		it('should not send where parameters when where is empty', async () => {
			const { ctx, request } = setup({
				...base,
				options: { whereParameters: { values: [{ value: 'a' }] } },
			});

			await node.execute.call(ctx);

			expect(sentBody(request)).toEqual({ from: 'bck7gp3q2', options: { top: 50 } });
		});

		it('should reject a where parameter that contains a single quote', async () => {
			const { ctx, request } = setup({
				...base,
				options: {
					where: "{6.EX.'$1'}",
					whereParameters: { values: [{ value: "O'Brien" }] },
				},
			});

			await expect(node.execute.call(ctx)).rejects.toThrow("'Where Parameters' cannot contain");
			expect(request).not.toHaveBeenCalled();
		});
	});
});
