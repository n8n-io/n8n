import { Raindrop } from '../Raindrop.node';
import * as GenericFunctions from '../GenericFunctions';

describe('Raindrop node', () => {
	let raindrop: Raindrop;
	let mockExecuteFunctions: any;

	beforeEach(() => {
		raindrop = new Raindrop();
		mockExecuteFunctions = {
			getInputData: vi.fn(),
			getNodeParameter: vi.fn(),
			continueOnFail: vi.fn().mockReturnValue(false),
			helpers: {
				returnJsonArray: vi.fn((data) => data.map((d: any) => ({ json: d }))),
			},
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('bookmark: getAll', () => {
		it('should fetch all bookmarks across pages when returnAll is true', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'resource') return 'bookmark';
				if (paramName === 'operation') return 'getAll';
				if (paramName === 'returnAll') return true;
				if (paramName === 'collectionId') return '12345';
				return undefined;
			});

			const mockBookmarks = [
				{ _id: 1, title: 'Bookmark 1' },
				{ _id: 2, title: 'Bookmark 2' },
			];

			const apiRequestAllItemsSpy = vi
				.spyOn(GenericFunctions, 'raindropApiRequestAllItems')
				.mockResolvedValue(mockBookmarks);

			const result = await raindrop.execute.call(mockExecuteFunctions);

			expect(apiRequestAllItemsSpy).toHaveBeenCalledWith(
				'items',
				'GET',
				'/raindrops/12345',
				{},
				{},
				undefined,
			);
			expect(result).toEqual([[{ json: mockBookmarks[0] }, { json: mockBookmarks[1] }]]);
		});

		it('should pass limit to raindropApiRequestAllItems when returnAll is false', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'resource') return 'bookmark';
				if (paramName === 'operation') return 'getAll';
				if (paramName === 'returnAll') return false;
				if (paramName === 'collectionId') return '12345';
				if (paramName === 'limit') return 5;
				return undefined;
			});

			const mockBookmarks = [{ _id: 1, title: 'Bookmark 1' }];

			const apiRequestAllItemsSpy = vi
				.spyOn(GenericFunctions, 'raindropApiRequestAllItems')
				.mockResolvedValue(mockBookmarks);

			const result = await raindrop.execute.call(mockExecuteFunctions);

			expect(apiRequestAllItemsSpy).toHaveBeenCalledWith(
				'items',
				'GET',
				'/raindrops/12345',
				{},
				{},
				5,
			);
			expect(result).toEqual([[{ json: mockBookmarks[0] }]]);
		});

		it('should pass itemIndex i to getNodeParameter for multiple items', async () => {
			mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);

			const getNodeParameterCalls: Array<{ param: string; index: number }> = [];
			mockExecuteFunctions.getNodeParameter.mockImplementation(
				(paramName: string, itemIndex: number) => {
					getNodeParameterCalls.push({ param: paramName, index: itemIndex });
					if (paramName === 'resource') return 'bookmark';
					if (paramName === 'operation') return 'getAll';
					if (paramName === 'returnAll') return false;
					if (paramName === 'collectionId') return itemIndex === 0 ? 'col-1' : 'col-2';
					if (paramName === 'limit') return itemIndex === 0 ? 5 : 10;
					return undefined;
				},
			);

			vi.spyOn(GenericFunctions, 'raindropApiRequestAllItems').mockResolvedValue([]);

			await raindrop.execute.call(mockExecuteFunctions);

			expect(getNodeParameterCalls).toContainEqual({ param: 'collectionId', index: 0 });
			expect(getNodeParameterCalls).toContainEqual({ param: 'collectionId', index: 1 });
			expect(getNodeParameterCalls).toContainEqual({ param: 'limit', index: 0 });
			expect(getNodeParameterCalls).toContainEqual({ param: 'limit', index: 1 });
		});
	});
});
