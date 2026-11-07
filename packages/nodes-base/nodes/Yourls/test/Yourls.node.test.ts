import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import type { Mock } from 'vitest';

import { Yourls } from '../Yourls.node';
import * as GenericFunctions from '../GenericFunctions';

vi.mock('../GenericFunctions', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../GenericFunctions')>();
	return { ...actual, yourlsApiRequest: vi.fn() };
});

describe('Yourls node, per-item query string', () => {
	it('does not leak Additional Fields from one item into the next', async () => {
		// Regression: qs used to be built once outside the item loop and mutated in place, so a
		// key set for item 0 (e.g. "title" from Additional Fields) stayed set on the shared object
		// and silently leaked into item 1's request even though item 1 never set it.
		const ctx = mock<IExecuteFunctions>();
		const items: INodeExecutionData[] = [{ json: {} }, { json: {} }];
		ctx.getInputData.mockReturnValue(items);
		ctx.getNodeParameter.mockImplementation((name: string, index: number) => {
			if (name === 'resource') return 'url';
			if (name === 'operation') return 'shorten';
			if (name === 'url') return index === 0 ? 'https://a.example' : 'https://b.example';
			if (name === 'additionalFields') return index === 0 ? { title: 'First' } : {};
			throw new Error(`unexpected getNodeParameter(${name}, ${index})`);
		});
		(GenericFunctions.yourlsApiRequest as Mock).mockResolvedValue({ shorturl: 'https://s/x' });

		await new Yourls().execute.call(ctx);

		const calls = (GenericFunctions.yourlsApiRequest as Mock).mock.calls;
		expect(calls).toHaveLength(2);
		expect(calls[0][2]).toMatchObject({ url: 'https://a.example', title: 'First' });
		expect(calls[1][2]).toEqual({ url: 'https://b.example', action: 'shorturl' });
		expect(calls[1][2]).not.toHaveProperty('title');
	});
});
