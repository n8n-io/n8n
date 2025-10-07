import type { ILoadOptionsFunctions } from 'n8n-workflow';

import { getWorkspaces, getBases, getRelatedTableFields } from '../../../v2/methods/listSearch';
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

	describe('getRelatedTableFields', () => {
		it('should return an empty array for version 3', async () => {
			(mockThis.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'version') return 3;
				return undefined;
			});

			const result = await getRelatedTableFields.call(mockThis);

			expect(result).toEqual({ results: [] });
		});

		it('should throw an error if no link field is selected', async () => {
			(mockThis.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'version') return 4;
				if (name === 'linkFieldName') return ''; // No link field selected
				return undefined;
			});

			await expect(getRelatedTableFields.call(mockThis)).rejects.toThrow('No link field selected!');
		});

		it('should return related table fields successfully (version 4)', async () => {
			(mockThis.getCredentials as jest.Mock).mockResolvedValue({ host: 'http://localhost:8080' });
			(mockThis.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'version') return 4;
				if (name === 'projectId') return 'base1';
				if (name === 'table') return 'table1';
				if (name === 'linkFieldName') return 'linkField1';
				return undefined;
			});
			apiRequestSpy
				.mockResolvedValueOnce({ options: { related_table_id: 'relatedTable1' } }) // First API call for link field
				.mockResolvedValueOnce({
					fields: [
						{ id: 'fieldA', title: 'Field A' },
						{ id: 'fieldB', title: 'Field B' },
					],
				}); // Second API call for related table fields

			const result = await getRelatedTableFields.call(mockThis);

			expect(apiRequestSpy).toHaveBeenCalledTimes(2);
			expect(apiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/api/v3/meta/bases/base1/tables/table1/fields/linkField1',
				{},
				{},
			);
			expect(apiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/api/v3/meta/bases/base1/tables/relatedTable1',
				{},
				{},
			);
			expect(result).toEqual({
				results: [
					{ name: 'Field A', value: 'fieldA' },
					{ name: 'Field B', value: 'fieldB' },
				],
			});
		});

		it('should return empty results if no related_table_id is found', async () => {
			(mockThis.getCredentials as jest.Mock).mockResolvedValue({ host: 'http://localhost:8080' });
			(mockThis.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'version') return 4;
				if (name === 'projectId') return 'base1';
				if (name === 'table') return 'table1';
				if (name === 'linkFieldName') return 'linkField1';
				return undefined;
			});
			apiRequestSpy.mockResolvedValueOnce({ options: {} }); // No related_table_id

			const result = await getRelatedTableFields.call(mockThis);

			expect(apiRequestSpy).toHaveBeenCalledTimes(1);
			expect(apiRequestSpy).toHaveBeenCalledWith(
				'GET',
				'/api/v3/meta/bases/base1/tables/table1/fields/linkField1',
				{},
				{},
			);
			expect(result).toEqual({ results: [] });
		});

		it('should throw NodeOperationError on first API error', async () => {
			(mockThis.getCredentials as jest.Mock).mockResolvedValue({ host: 'http://localhost:8080' });
			(mockThis.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'version') return 4;
				if (name === 'projectId') return 'base1';
				if (name === 'table') return 'table1';
				if (name === 'linkFieldName') return 'linkField1';
				return undefined;
			});
			apiRequestSpy.mockRejectedValueOnce({
				messages: ['First API Error'],
			});

			await expect(getRelatedTableFields.call(mockThis)).rejects.toThrow(
				'Error while fetching fields: First API Error',
			);
		});

		it('should throw NodeOperationError on second API error', async () => {
			(mockThis.getCredentials as jest.Mock).mockResolvedValue({ host: 'http://localhost:8080' });
			(mockThis.getNodeParameter as jest.Mock).mockImplementation((name: string) => {
				if (name === 'version') return 4;
				if (name === 'projectId') return 'base1';
				if (name === 'table') return 'table1';
				if (name === 'linkFieldName') return 'linkField1';
				return undefined;
			});
			apiRequestSpy
				.mockResolvedValueOnce({ options: { related_table_id: 'relatedTable1' } })
				.mockRejectedValueOnce({
					messages: ['Second API Error'],
				});

			await expect(getRelatedTableFields.call(mockThis)).rejects.toThrow(
				'Error while fetching fields: Second API Error',
			);
		});
	});
});
