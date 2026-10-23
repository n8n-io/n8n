/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable n8n-nodes-base/node-param-display-name-miscased -- fixtures mirror API "Title (type)" labels */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getBoardGroups, groupResourceLocator, searchGroups } from '../helpers/groupLocator';
import { getBoardColumns, getTargetBoardColumns } from '../helpers/columnOptions';

describe('groupResourceLocator', () => {
	it('offers list and id modes', () => {
		const modeNames = groupResourceLocator.modes?.map((m) => m.name);
		expect(modeNames).toEqual(['list', 'id']);
	});

	it('uses the searchGroups listSearch method with search enabled', () => {
		const listMode = groupResourceLocator.modes?.find((m) => m.name === 'list');
		expect(listMode?.typeOptions?.searchListMethod).toBe('searchGroups');
		expect(listMode?.typeOptions?.searchable).toBe(true);
	});
});

describe('searchGroups', () => {
	let mockContext: any;

	beforeEach(() => {
		mockContext = {
			getNode: vi.fn(() => ({ name: 'test-node' })),
			getCurrentNodeParameter: vi.fn(() => '123'),
			helpers: { httpRequestWithAuthentication: vi.fn() },
		};
	});

	it('reads the board from the boardId parameter and lists its groups', async () => {
		mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			data: {
				boards: [
					{
						groups: [
							{ id: 'topics', title: 'Topics' },
							{ id: 'group_2', title: 'Done' },
						],
					},
				],
			},
		});

		const result = await searchGroups.call(mockContext);

		expect(mockContext.getCurrentNodeParameter).toHaveBeenCalledWith('boardId', {
			extractValue: true,
		});
		const call = mockContext.helpers.httpRequestWithAuthentication.mock.calls[0][1];
		expect(call.body.variables).toEqual({ ids: ['123'] });
		expect(result.results).toEqual([
			{ name: 'Topics', value: 'topics' },
			{ name: 'Done', value: 'group_2' },
		]);
	});

	it('filters groups by title case-insensitively', async () => {
		mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			data: {
				boards: [
					{
						groups: [
							{ id: 'topics', title: 'Topics' },
							{ id: 'group_2', title: 'Done' },
						],
					},
				],
			},
		});

		const result = await searchGroups.call(mockContext, 'done');

		expect(result.results).toEqual([{ name: 'Done', value: 'group_2' }]);
	});

	it('returns empty without an API call when no board is selected', async () => {
		mockContext.getCurrentNodeParameter.mockReturnValue('');

		const result = await searchGroups.call(mockContext);

		expect(result.results).toEqual([]);
		expect(mockContext.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
	});

	it('getBoardGroups exposes the same list as multiOptions', async () => {
		mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			data: {
				boards: [
					{
						groups: [
							{ id: 'topics', title: 'Topics' },
							{ id: 'group_2', title: 'Done' },
						],
					},
				],
			},
		});

		const options = await getBoardGroups.call(mockContext);

		expect(options).toEqual([
			{ name: 'Topics', value: 'topics' },
			{ name: 'Done', value: 'group_2' },
		]);
	});
});

describe('getBoardColumns', () => {
	let mockContext: any;

	beforeEach(() => {
		mockContext = {
			getNode: vi.fn(() => ({ name: 'test-node' })),
			getCurrentNodeParameter: vi.fn(() => '123'),
			helpers: { httpRequestWithAuthentication: vi.fn() },
		};
	});

	it('lists board columns as "Title (type)" options', async () => {
		mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			data: {
				boards: [
					{
						columns: [
							{ id: 'name', title: 'Name', type: 'name' },
							{ id: 'status', title: 'Status', type: 'status' },
						],
					},
				],
			},
		});

		const result = await getBoardColumns.call(mockContext);

		expect(result).toEqual([
			{ name: 'Name (name)', value: 'name' },
			{ name: 'Status (status)', value: 'status' },
		]);
	});

	it('returns empty without an API call when no board is selected', async () => {
		mockContext.getCurrentNodeParameter.mockReturnValue('');

		const result = await getBoardColumns.call(mockContext);

		expect(result).toEqual([]);
		expect(mockContext.helpers.httpRequestWithAuthentication).not.toHaveBeenCalled();
	});

	it('getTargetBoardColumns reads the targetBoardId parameter instead', async () => {
		mockContext.helpers.httpRequestWithAuthentication.mockResolvedValue({
			data: {
				boards: [{ columns: [{ id: 'status', title: 'Status', type: 'status' }] }],
			},
		});

		const result = await getTargetBoardColumns.call(mockContext);

		expect(mockContext.getCurrentNodeParameter).toHaveBeenCalledWith('targetBoardId', {
			extractValue: true,
		});
		expect(result).toEqual([{ name: 'Status (status)', value: 'status' }]);
	});
});
