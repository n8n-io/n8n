import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { searchEntitySets, searchRows } from '../loadOptions';
import { MicrosoftDataverse } from '../MicrosoftDataverse.node';
import { createRow } from '../operations/createRow';
import { getManyRows } from '../operations/getManyRows';

const CREDENTIAL_TYPE = 'microsoftDataverseOAuth2Api';

/**
 * These tests exercise the node's real routing: `resolveOperation` picks the
 * op module from the shared registry, and the node wraps its output. Only the
 * leaf `execute` of each op module is stubbed (via `vi.spyOn`), so aliasing and
 * error handling run against production code.
 */
describe('MicrosoftDataverse Node', () => {
	let ctx: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	const node: INode = {
		id: 'test-node',
		name: 'Microsoft Dataverse',
		type: 'n8n-nodes-base.microsoftDataverse',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	beforeEach(() => {
		ctx = mockDeep<IExecuteFunctions>();
		ctx.getNode.mockReturnValue(node);
		ctx.continueOnFail.mockReturnValue(false);

		// Minimal faithful implementations so we can assert on wrapping/paired items.
		ctx.helpers.returnJsonArray.mockImplementation((data) => {
			const arr = Array.isArray(data) ? data : [data];
			return arr.map((json) => ({ json })) as INodeExecutionData[];
		});
		ctx.helpers.constructExecutionMetaData.mockImplementation(
			(data, { itemData }) =>
				(data as INodeExecutionData[]).map((d) => ({
					...d,
					pairedItem: itemData,
				})) as unknown as ReturnType<typeof ctx.helpers.constructExecutionMetaData>,
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('uses searchable resource locators for every table and row ID property', () => {
		const instance = new MicrosoftDataverse();
		const tableProperties = instance.description.properties.filter(
			(property) => property.name === 'entitySet',
		);
		const rowProperties = instance.description.properties.filter(
			(property) => property.name === 'recordId',
		);

		expect(tableProperties).toHaveLength(6);
		expect(tableProperties.every((property) => property.type === 'resourceLocator')).toBe(true);
		expect(
			tableProperties.every(
				(property) => property.modes?.[0]?.typeOptions?.searchListMethod === 'searchEntitySets',
			),
		).toBe(true);
		expect(rowProperties).toHaveLength(4);
		expect(rowProperties.every((property) => property.type === 'resourceLocator')).toBe(true);
		expect(
			rowProperties.every(
				(property) => property.modes?.[0]?.typeOptions?.searchListMethod === 'searchRows',
			),
		).toBe(true);
		expect(instance.methods.listSearch).toEqual({
			searchEntitySets,
			searchRows,
		});
	});

	it('lists operations alphabetically by name, matching the n8n catalog convention', () => {
		const instance = new MicrosoftDataverse();
		const operation = instance.description.properties.find(
			(property) => property.name === 'operation',
		);
		const names = (operation?.options ?? []).map((option) => (option as { name: string }).name);

		expect(names).toEqual(['Create', 'Create or Update', 'Delete', 'Get', 'Get Many', 'Update']);
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
	});

	it('routes an operation to the matching op module and wraps the result', async () => {
		ctx.getInputData.mockReturnValue([{ json: { in: 1 } }]);
		ctx.getNodeParameter.mockReturnValue('create');
		const executeSpy = vi.spyOn(createRow, 'execute').mockResolvedValue({ id: 'row-1' });

		const result = await MicrosoftDataverse.prototype.execute.call(ctx);

		expect(executeSpy).toHaveBeenCalledWith(ctx, 0, CREDENTIAL_TYPE);
		expect(result).toEqual([[{ json: { id: 'row-1' }, pairedItem: { item: 0 } }]]);
	});

	it('flattens an array result from an op module into multiple items', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.getNodeParameter.mockReturnValue('getAll');
		vi.spyOn(getManyRows, 'execute').mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

		const result = await MicrosoftDataverse.prototype.execute.call(ctx);

		expect(result[0]).toHaveLength(2);
		expect(result[0].map((r) => r.json)).toEqual([{ id: 'a' }, { id: 'b' }]);
	});

	it('throws NodeOperationError for an unsupported operation', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.getNodeParameter.mockReturnValue('does-not-exist');

		await expect(MicrosoftDataverse.prototype.execute.call(ctx)).rejects.toThrow(
			NodeOperationError,
		);
		await expect(MicrosoftDataverse.prototype.execute.call(ctx)).rejects.toThrow(
			/Unsupported operation "does-not-exist"/,
		);
	});

	it('collects the error instead of throwing when continueOnFail is on', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.getNodeParameter.mockReturnValue('create');
		ctx.continueOnFail.mockReturnValue(true);
		vi.spyOn(createRow, 'execute').mockRejectedValue(new Error('boom'));

		const result = await MicrosoftDataverse.prototype.execute.call(ctx);

		expect(result).toEqual([[{ json: { error: 'boom' }, pairedItem: { item: 0 } }]]);
	});

	it('processes every input item and preserves the paired item index', async () => {
		ctx.getInputData.mockReturnValue([{ json: { i: 0 } }, { json: { i: 1 } }]);
		const executeSpy = vi
			.spyOn(createRow, 'execute')
			.mockImplementation(async (_ctx, i) => ({ id: `row-${i}` }));
		// Route both items to the create op.
		ctx.getNodeParameter.mockReturnValue('create');

		const result = await MicrosoftDataverse.prototype.execute.call(ctx);

		expect(executeSpy).toHaveBeenCalledTimes(2);
		expect(executeSpy).toHaveBeenNthCalledWith(1, ctx, 0, CREDENTIAL_TYPE);
		expect(executeSpy).toHaveBeenNthCalledWith(2, ctx, 1, CREDENTIAL_TYPE);
		expect(result[0]).toEqual([
			{ json: { id: 'row-0' }, pairedItem: { item: 0 } },
			{ json: { id: 'row-1' }, pairedItem: { item: 1 } },
		]);
	});

	it('keeps prior successes and collects the failure for a mixed batch when continueOnFail is on', async () => {
		ctx.getInputData.mockReturnValue([{ json: { i: 0 } }, { json: { i: 1 } }]);
		ctx.getNodeParameter.mockReturnValue('create');
		ctx.continueOnFail.mockReturnValue(true);
		vi.spyOn(createRow, 'execute')
			.mockResolvedValueOnce({ id: 'row-0' })
			.mockRejectedValueOnce(new Error('boom'));

		const result = await MicrosoftDataverse.prototype.execute.call(ctx);

		expect(result[0]).toEqual([
			{ json: { id: 'row-0' }, pairedItem: { item: 0 } },
			{ json: { error: 'boom' }, pairedItem: { item: 1 } },
		]);
	});

	it('falls back to String(error) when a non-Error value is thrown', async () => {
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.getNodeParameter.mockReturnValue('create');
		ctx.continueOnFail.mockReturnValue(true);
		vi.spyOn(createRow, 'execute').mockRejectedValue('plain failure');

		const result = await MicrosoftDataverse.prototype.execute.call(ctx);

		expect(result).toEqual([[{ json: { error: 'plain failure' }, pairedItem: { item: 0 } }]]);
	});

	it('returns a single empty branch when there are no input items', async () => {
		ctx.getInputData.mockReturnValue([]);

		const result = await MicrosoftDataverse.prototype.execute.call(ctx);

		expect(result).toEqual([[]]);
	});
});
