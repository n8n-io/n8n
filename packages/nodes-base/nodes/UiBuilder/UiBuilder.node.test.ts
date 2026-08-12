import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { UiBuilder } from './UiBuilder.node';

const VALID = {
	id: 'app',
	type: 'frame',
	props: { defaultPage: '/' },
	tree: {
		default: [
			{
				id: 'home',
				type: 'page',
				props: { path: '/', title: 'Home' },
				tree: { default: [{ id: 'hi', type: 'heading', props: { text: 'Hi' }, tree: {} }] },
			},
		],
	},
};

const setup = (definition: unknown) => {
	const context = mock<IExecuteFunctions>();

	context.getInputData.mockReturnValue([{ json: {} }]);
	context.getNode.mockReturnValue(mock<INode>({ name: 'UI Builder' }));
	context.getWorkflow.mockReturnValue({ id: '1', name: 'Orders', active: true });
	context.getNodeParameter.mockImplementation((name: string) => {
		if (name === 'definition') return definition;
		if (name === 'authenticateActions') return false;
		return '';
	});

	return context;
};

describe('UiBuilder node', () => {
	it('serves the page and answers the request itself', async () => {
		const context = setup(VALID);

		const result = await new UiBuilder().execute.call(context);

		expect(context.sendResponse).toHaveBeenCalledWith(
			expect.objectContaining({
				statusCode: 200,
				headers: { 'content-type': 'text/html; charset=utf-8' },
			}),
		);
		expect(result[0][0].json.html).toContain('window.__N8N_UI__');
	});

	it('still reads a definition stored as JSON text', async () => {
		const context = setup(JSON.stringify(VALID));

		await expect(new UiBuilder().execute.call(context)).resolves.toBeDefined();
	});

	it('rejects text that is not JSON', async () => {
		const context = setup('{ nope');

		await expect(new UiBuilder().execute.call(context)).rejects.toThrow(
			/Definition is not valid JSON/,
		);
	});

	it('names what is wrong with an invalid definition', async () => {
		const context = setup({
			id: 'app',
			type: 'frame',
			props: {},
			tree: { default: [{ id: 'b', type: 'buton', props: {}, tree: {} }] },
		});

		await expect(new UiBuilder().execute.call(context)).rejects.toThrow(NodeOperationError);
		await expect(new UiBuilder().execute.call(context)).rejects.toThrow(
			/b\.type: Unknown component type "buton"/,
		);
	});

	it('reports every problem at once', async () => {
		const context = setup({
			id: 'app',
			type: 'frame',
			props: {},
			tree: {
				default: [
					{ id: 'p', type: 'page', props: { nope: 1 }, tree: {} },
					{ id: 'p', type: 'page', props: {}, tree: {} },
				],
			},
		});

		await expect(new UiBuilder().execute.call(context)).rejects.toThrow(
			/has no prop "nope".*Duplicate id "p"/s,
		);
	});
});
