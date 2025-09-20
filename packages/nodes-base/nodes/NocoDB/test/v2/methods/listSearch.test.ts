import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getWorkspaces, getBases } from '../../../v2/methods/listSearch';
import * as transport from '../../../v2/transport';

describe('NocoDB List Search Methods', () => {
	// Import listSearch functions here to avoid formatter issues
	let mockThis: ILoadOptionsFunctions;
	let apiRequestSpy: jest.SpyInstance;

	beforeEach(() => {
		mockThis = {
			getNodeParameter: jest.fn(),
			getCredentials: jest.fn(),
			getNode: jest.fn(() => ({
				parameters: {},
				id: 'node1',
				name: 'NocoDB',
				type: 'n8n-nodes-base.nocodb',
				disabled: false,
				json: true,
				credentials: {},
			})),
		} as unknown as ILoadOptionsFunctions;

		apiRequestSpy = jest.spyOn(transport, 'apiRequest');
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('getWorkspaces', () => {
		it('should return a list of workspaces', async () => {
			(mockThis.getCredentials as jest.Mock).mockResolvedValue({ host: 'http://localhost:8080' });
			apiRequestSpy.mockResolvedValue({
				list: [
					{ id: 'ws1', title: 'Workspace 1' },
					{ id: 'ws2', title: 'Workspace 2' },
				],
			});

			const result = await getWorkspaces.call(mockThis);

			expect(apiRequestSpy).toHaveBeenCalledWith('GET', '/api/v2/meta/workspaces', {}, {});
			expect(result).toEqual({
				results: [
					{ name: 'Workspace 1', value: 'ws1', url: 'http://localhost:8080/#/ws1' },
					{ name: 'Workspace 2', value: 'ws2', url: 'http://localhost:8080/#/ws2' },
				],
			});
		});

		it('should filter workspaces based on the provided filter', async () => {
			(mockThis.getCredentials as jest.Mock).mockResolvedValue({ host: 'http://localhost:8080' });
			apiRequestSpy.mockResolvedValue({
				list: [
					{ id: 'ws1', title: 'Workspace Alpha' },
					{ id: 'ws2', title: 'Workspace Beta' },
					{ id: 'ws3', title: 'Another Workspace' },
				],
			});

			const result = await getWorkspaces.call(mockThis, 'Alpha');

			expect(apiRequestSpy).toHaveBeenCalledWith('GET', '/api/v2/meta/workspaces', {}, {});
			expect(result).toEqual({
				results: [{ name: 'Workspace Alpha', value: 'ws1', url: 'http://localhost:8080/#/ws1' }],
			});
		});

		it('should handle API errors gracefully', async () => {
			(mockThis.getCredentials as jest.Mock).mockResolvedValue({ host: 'http://localhost:8080' });
			apiRequestSpy.mockRejectedValue(new Error('API Error'));

			const result = await getWorkspaces.call(mockThis);

			expect(result).toEqual({ results: [{ name: 'No Workspace', value: 'none' }] });
		});
	});

	describe('getBases', () => {
		it('should return a list of bases for a given workspace (v4)', async () => {
			(mockThis.getCredentials as jest.Mock).mockResolvedValue({ host: 'http://localhost:8080' });
			(mockThis.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'version') return 4;
				if (name === 'workspaceId') return 'ws1';
				return undefined;
			});
			apiRequestSpy.mockResolvedValue({
				list: [
					{ id: 'base1', title: 'Base 1' },
					{ id: 'base2', title: 'Base 2' },
				],
			});

			const result = await getBases.call(mockThis);

			expect(mockThis.getNodeParameter).toHaveBeenCalledWith('version', 0);
			expect(mockThis.getNodeParameter).toHaveBeenCalledWith('workspaceId', 0, {
				extractValue: true,
			});
			expect(apiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/api/v3/meta/workspaces/ws1/bases',
				{},
				{},
			);
			expect(result).toEqual({
				results: [
					{ name: 'Base 1', value: 'base1', url: 'http://localhost:8080/#/ws1/base1' },
					{ name: 'Base 2', value: 'base2', url: 'http://localhost:8080/#/ws1/base2' },
				],
			});
		});

		it('should return a list of bases for a given workspace (v2)', async () => {
			(mockThis.getCredentials as jest.Mock).mockResolvedValue({ host: 'http://localhost:8080' });
			(mockThis.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'version') return 2;
				if (name === 'workspaceId') return 'ws1';
				return undefined;
			});
			apiRequestSpy.mockResolvedValue({
				list: [
					{ id: 'baseA', title: 'Base A' },
					{ id: 'baseB', title: 'Base B' },
				],
			});

			const result = await getBases.call(mockThis);

			expect(mockThis.getNodeParameter).toHaveBeenCalledWith('version', 0);
			expect(mockThis.getNodeParameter).toHaveBeenCalledWith('workspaceId', 0, {
				extractValue: true,
			});
			expect(apiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/api/v2/meta/workspaces/ws1/bases',
				{},
				{},
			);
			expect(result).toEqual({
				results: [
					{ name: 'Base A', value: 'baseA', url: 'http://localhost:8080/#/ws1/baseA' },
					{ name: 'Base B', value: 'baseB', url: 'http://localhost:8080/#/ws1/baseB' },
				],
			});
		});

		it('should return a list of bases without workspace (v3)', async () => {
			(mockThis.getCredentials as jest.Mock).mockResolvedValue({ host: 'http://localhost:8080' });
			(mockThis.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'version') return 3;
				if (name === 'workspaceId') return 'none';
				return undefined;
			});
			apiRequestSpy.mockResolvedValue({
				list: [
					{ id: 'baseX', title: 'Base X' },
					{ id: 'baseY', title: 'Base Y' },
				],
			});

			const result = await getBases.call(mockThis);

			expect(mockThis.getNodeParameter).toHaveBeenCalledWith('version', 0);
			expect(mockThis.getNodeParameter).toHaveBeenCalledWith('workspaceId', 0, {
				extractValue: true,
			});
			expect(apiRequestSpy).toHaveBeenCalledWith('GET', '/api/v2/meta/bases/', {}, {});
			expect(result).toEqual({
				results: [
					{ name: 'Base X', value: 'baseX', url: 'http://localhost:8080/#/nc/baseX' },
					{ name: 'Base Y', value: 'baseY', url: 'http://localhost:8080/#/nc/baseY' },
				],
			});
		});

		it('should return a list of bases without workspace (v1)', async () => {
			(mockThis.getCredentials as jest.Mock).mockResolvedValue({ host: 'http://localhost:8080' });
			(mockThis.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'version') return 1;
				if (name === 'workspaceId') return 'none';
				return undefined;
			});
			apiRequestSpy.mockResolvedValue({
				list: [
					{ id: 'baseP', title: 'Base P' },
					{ id: 'baseQ', title: 'Base Q' },
				],
			});

			const result = await getBases.call(mockThis);

			expect(mockThis.getNodeParameter).toHaveBeenCalledWith('version', 0);
			expect(mockThis.getNodeParameter).toHaveBeenCalledWith('workspaceId', 0, {
				extractValue: true,
			});
			expect(apiRequestSpy).toHaveBeenCalledWith('GET', '/api/v1/db/meta/projects/', {}, {});
			expect(result).toEqual({
				results: [
					{ name: 'Base P', value: 'baseP', url: 'http://localhost:8080/#/nc/baseP' },
					{ name: 'Base Q', value: 'baseQ', url: 'http://localhost:8080/#/nc/baseQ' },
				],
			});
		});

		it('should filter bases based on the provided filter', async () => {
			(mockThis.getCredentials as jest.Mock).mockResolvedValue({ host: 'http://localhost:8080' });
			(mockThis.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'version') return 4;
				if (name === 'workspaceId') return 'ws1';
				return undefined;
			});
			apiRequestSpy.mockResolvedValue({
				list: [
					{ id: 'base1', title: 'Base Alpha' },
					{ id: 'base2', title: 'Base Beta' },
					{ id: 'base3', title: 'Another Base' },
				],
			});

			const result = await getBases.call(mockThis, 'Alpha');

			expect(apiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/api/v3/meta/workspaces/ws1/bases',
				{},
				{},
			);
			expect(result).toEqual({
				results: [{ name: 'Base Alpha', value: 'base1', url: 'http://localhost:8080/#/ws1/base1' }],
			});
		});

		it('should throw NodeOperationError on API error', async () => {
			(mockThis.getCredentials as jest.Mock).mockResolvedValue({ host: 'http://localhost:8080' });
			(mockThis.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'version') return 4;
				if (name === 'workspaceId') return 'ws1';
				return undefined;
			});
			apiRequestSpy.mockRejectedValue(new Error('API Error'));

			await expect(getBases.call(mockThis)).rejects.toThrow('Error while fetching bases!');
		});
	});
});
