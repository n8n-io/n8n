import { returnJsonArray } from 'n8n-core';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { Raindrop } from '../Raindrop.node';

describe('Raindrop Node, bookmark: getAll', () => {
	let mockExecuteFunctions: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	/**
	 * Serve `total` bookmarks, honouring the `perpage` and `page` query parameters.
	 * A request that sends neither gets Raindrop's own defaults: the first 25.
	 */
	const serve = (total: number) => {
		mockExecuteFunctions.helpers.requestOAuth2.mockImplementation(async (_credentials, options) => {
			const qs = ((options as { qs?: IDataObject }).qs ?? {}) as {
				perpage?: number;
				page?: number;
			};
			const perpage = qs.perpage ?? 25;
			const page = qs.page ?? 0;
			const start = page * perpage;
			const count = Math.max(0, Math.min(perpage, total - start));
			return { items: Array.from({ length: count }, (_, index) => ({ _id: start + index })) };
		});
	};

	const setParameters = (parameters: IDataObject) => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(name, _itemIndex, fallback) => parameters[name] ?? fallback,
		);
	};

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.helpers.returnJsonArray.mockImplementation(returnJsonArray);
	});

	it('returns every bookmark when Return All is on', async () => {
		serve(130);
		setParameters({
			resource: 'bookmark',
			operation: 'getAll',
			returnAll: true,
			collectionId: 0,
		});

		const [items] = await new Raindrop().execute.call(mockExecuteFunctions);

		expect(items).toHaveLength(130);
		expect(items[129].json).toEqual({ _id: 129 });
	});

	it('returns a limit that is larger than one page', async () => {
		serve(200);
		setParameters({
			resource: 'bookmark',
			operation: 'getAll',
			returnAll: false,
			limit: 60,
			collectionId: 0,
		});

		const [items] = await new Raindrop().execute.call(mockExecuteFunctions);

		expect(items).toHaveLength(60);
	});

	it('returns the whole collection when it is smaller than the limit', async () => {
		serve(7);
		setParameters({
			resource: 'bookmark',
			operation: 'getAll',
			returnAll: false,
			limit: 100,
			collectionId: 0,
		});

		const [items] = await new Raindrop().execute.call(mockExecuteFunctions);

		expect(items).toHaveLength(7);
	});
});
