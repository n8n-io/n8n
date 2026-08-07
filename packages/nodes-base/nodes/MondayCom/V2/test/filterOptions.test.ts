/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	getBoardList,
	getWorkspaceFolders,
	getWorkspaces,
	normalizeIdList,
	toIso8601,
} from '../helpers/filterOptions';

describe('toIso8601', () => {
	it('converts the n8n picker\u2019s naive local datetime to UTC ISO 8601', () => {
		// The picker emits "YYYY-MM-DD HH:mm:ss" (no T, no timezone), which
		// monday's ISO8601DateTime scalar rejects outright.
		const result = toIso8601('2026-07-22 00:00:00');
		expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		expect(new Date(result!).getTime()).toBe(new Date('2026-07-22 00:00:00').getTime());
	});

	it('normalizes T-separated and offset forms to UTC', () => {
		expect(toIso8601('2026-07-22T10:00:00+03:00')).toBe('2026-07-22T07:00:00.000Z');
		expect(toIso8601('2026-07-22T07:00:00.000Z')).toBe('2026-07-22T07:00:00.000Z');
	});

	it('returns undefined for empty values', () => {
		expect(toIso8601('')).toBeUndefined();
		expect(toIso8601('   ')).toBeUndefined();
		expect(toIso8601(undefined)).toBeUndefined();
		expect(toIso8601(null)).toBeUndefined();
	});

	it('passes unparseable strings through for the API to reject with a clear error', () => {
		expect(toIso8601('not-a-date')).toBe('not-a-date');
	});
});

describe('normalizeIdList', () => {
	it('passes through a dropdown array, stringified', () => {
		expect(normalizeIdList(['123', 456])).toEqual(['123', '456']);
	});

	it('splits a CSV string from expression mode', () => {
		expect(normalizeIdList(' 123, 456 ,789 ')).toEqual(['123', '456', '789']);
	});

	it('drops empty entries', () => {
		expect(normalizeIdList('123,,456,')).toEqual(['123', '456']);
		expect(normalizeIdList(['123', '', ' '])).toEqual(['123']);
	});

	it('returns empty for unset values', () => {
		expect(normalizeIdList(undefined)).toEqual([]);
		expect(normalizeIdList('')).toEqual([]);
		expect(normalizeIdList([])).toEqual([]);
	});
});

describe('getWorkspaces', () => {
	let mockContext: any;
	let httpMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		httpMock = vi.fn();
		mockContext = {
			getNode: vi.fn(() => ({ name: 'test-node' })),
			helpers: { httpRequestWithAuthentication: httpMock },
		};
	});

	it('returns workspaces sorted by name', async () => {
		httpMock.mockResolvedValue({
			data: {
				workspaces: [
					{ id: '2', name: 'Zeta' },
					{ id: '1', name: 'Alpha' },
				],
			},
		});

		const options = await getWorkspaces.call(mockContext);

		expect(options).toEqual([
			{ name: 'Alpha', value: '1' },
			{ name: 'Zeta', value: '2' },
		]);
		// Short page -> no second request
		expect(httpMock).toHaveBeenCalledTimes(1);
	});

	it('pages through full pages up to the cap', async () => {
		const fullPage = Array.from({ length: 100 }, (_, i) => ({
			id: String(i),
			name: `ws-${i}`,
		}));
		httpMock
			.mockResolvedValueOnce({ data: { workspaces: fullPage } })
			.mockResolvedValueOnce({ data: { workspaces: [{ id: 'last', name: 'Last' }] } });

		const options = await getWorkspaces.call(mockContext);

		expect(options).toHaveLength(101);
		expect(httpMock).toHaveBeenCalledTimes(2);
		expect(httpMock.mock.calls[1][1].body.variables).toMatchObject({ page: 2 });
	});
});

describe('getBoardList', () => {
	let mockContext: any;
	let httpMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		httpMock = vi.fn();
		mockContext = {
			getNode: vi.fn(() => ({ name: 'test-node' })),
			helpers: { httpRequestWithAuthentication: httpMock },
		};
	});

	it('loads a single 500-board window ordered by recent use, labeled with workspace, excluding docs', async () => {
		httpMock.mockResolvedValue({
			data: {
				boards: [
					{ id: '1', name: 'CRM', type: 'board', workspace: { name: 'Sales' } },
					{ id: '2', name: 'Roadmap', type: 'board', workspace: null },
					{ id: '3', name: 'Welcome doc', type: 'document', workspace: null },
				],
			},
		});

		const options = await getBoardList.call(mockContext);

		expect(options).toEqual([
			{ name: 'CRM (Sales)', value: '1' },
			{ name: 'Roadmap', value: '2' },
		]);
		expect(httpMock).toHaveBeenCalledTimes(1);
		expect(httpMock.mock.calls[0][1].body.variables).toEqual({ limit: 500 });
		expect(httpMock.mock.calls[0][1].body.query).toContain('order_by: used_at');
		expect(httpMock.mock.calls[0][1].body.query).toContain('workspace { name }');
	});
});

describe('getWorkspaceFolders', () => {
	let mockContext: any;
	let httpMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		httpMock = vi.fn();
		mockContext = {
			getNode: vi.fn(() => ({ name: 'test-node' })),
			getCurrentNodeParameter: vi.fn(),
			helpers: { httpRequestWithAuthentication: httpMock },
		};
	});

	it('returns empty without an API call when no workspace is selected', async () => {
		mockContext.getCurrentNodeParameter.mockReturnValue(undefined);

		const options = await getWorkspaceFolders.call(mockContext);

		expect(options).toEqual([]);
		expect(httpMock).not.toHaveBeenCalled();
		// The workspace param is a resource locator — the loader unwraps it.
		expect(mockContext.getCurrentNodeParameter).toHaveBeenCalledWith(
			'duplicateBoardOptions.workspaceId',
			{ extractValue: true },
		);
	});

	it('lists the selected workspace’s folders sorted by name', async () => {
		mockContext.getCurrentNodeParameter.mockReturnValue('16476169');
		httpMock.mockResolvedValue({
			data: {
				folders: [
					{ id: '2', name: 'Zeta' },
					{ id: '1', name: 'Alpha' },
				],
			},
		});

		const options = await getWorkspaceFolders.call(mockContext);

		expect(options).toEqual([
			{ name: 'Alpha', value: '1' },
			{ name: 'Zeta', value: '2' },
		]);
		expect(httpMock.mock.calls[0][1].body.variables).toEqual({
			workspaceIds: ['16476169'],
			limit: 100,
			page: 1,
		});
	});

	it('pages through full pages up to the cap', async () => {
		mockContext.getCurrentNodeParameter.mockReturnValue('16476169');
		const fullPage = Array.from({ length: 100 }, (_, i) => ({
			id: String(i),
			name: `folder-${i}`,
		}));
		httpMock
			.mockResolvedValueOnce({ data: { folders: fullPage } })
			.mockResolvedValueOnce({ data: { folders: [{ id: 'last', name: 'Last' }] } });

		const options = await getWorkspaceFolders.call(mockContext);

		expect(options).toHaveLength(101);
		expect(httpMock).toHaveBeenCalledTimes(2);
		expect(httpMock.mock.calls[1][1].body.variables).toMatchObject({ page: 2 });
	});
});
