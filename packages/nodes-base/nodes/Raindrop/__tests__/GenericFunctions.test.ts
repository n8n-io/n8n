import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { raindropApiRequestAllItems } from '../GenericFunctions';

describe('Raindrop GenericFunctions', () => {
	let mockExecuteFunctions: ReturnType<typeof mockDeep<IExecuteFunctions>>;

	/** A page of `count` bookmarks, numbered from `from`. */
	const page = (from: number, count: number) => ({
		items: Array.from({ length: count }, (_, index) => ({ _id: from + index })),
	});

	/** Serve `total` bookmarks, honouring the `perpage` and `page` query parameters. */
	const serve = (total: number) => {
		mockExecuteFunctions.helpers.requestOAuth2.mockImplementation(async (_credentials, options) => {
			const { perpage, page: pageIndex } = (options as { qs: IDataObject }).qs as {
				perpage: number;
				page: number;
			};
			const start = pageIndex * perpage;
			return page(start, Math.max(0, Math.min(perpage, total - start)));
		});
	};

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
	});

	describe('raindropApiRequestAllItems', () => {
		it('reads every page when no limit is given', async () => {
			serve(130);

			const items = await raindropApiRequestAllItems.call(
				mockExecuteFunctions,
				'GET',
				'/raindrops/0',
				{},
				{},
			);

			expect(items).toHaveLength(130);
			expect(items[0]).toEqual({ _id: 0 });
			expect(items[129]).toEqual({ _id: 129 });
		});

		it('stops on the first short page', async () => {
			serve(60);

			const items = await raindropApiRequestAllItems.call(
				mockExecuteFunctions,
				'GET',
				'/raindrops/0',
				{},
				{},
			);

			expect(items).toHaveLength(60);
			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(2);
		});

		it('reads enough pages to satisfy a limit larger than one page', async () => {
			serve(200);

			const items = await raindropApiRequestAllItems.call(
				mockExecuteFunctions,
				'GET',
				'/raindrops/0',
				{},
				{},
				75,
			);

			expect(items).toHaveLength(75);
			expect(items[74]).toEqual({ _id: 74 });
		});

		it('asks for no more than the limit when it fits in one page', async () => {
			serve(200);

			const items = await raindropApiRequestAllItems.call(
				mockExecuteFunctions,
				'GET',
				'/raindrops/0',
				{},
				{},
				5,
			);

			expect(items).toHaveLength(5);
			expect(mockExecuteFunctions.helpers.requestOAuth2).toHaveBeenCalledTimes(1);
		});

		it('returns what exists when the collection is smaller than the limit', async () => {
			serve(3);

			const items = await raindropApiRequestAllItems.call(
				mockExecuteFunctions,
				'GET',
				'/raindrops/0',
				{},
				{},
				100,
			);

			expect(items).toHaveLength(3);
		});
	});
});
