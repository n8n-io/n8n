import { getApiVersions, getDownloadFields } from '../../../v2/methods/loadOptions';

// Mock ColumnsFetcher globally
const mockColumnsFetcher = {
	fetchFromDefinedParam: jest.fn(),
};

jest.mock('../../../v2/helpers/columns-fetcher', () => ({
	ColumnsFetcher: jest.fn(() => mockColumnsFetcher),
}));

describe('NocoDB Load Options', () => {
	describe('getApiVersions', () => {
		it('should return v0.200.0 and v0.260.0 for row resource and specific operations', async () => {
			const mockThis = {
				getNodeParameter: (param: string) => {
					if (param === 'resource') return 'row';
					if (param === 'operation') return 'get';
					if (param === 'authentication') return 'nocodb';
					return '';
				},
				getCredentials: (_authenticationMethod: string) => {
					return {
						isCloudNocoDb: false,
					};
				},
			};
			const result = await getApiVersions.call(mockThis as any);
			expect(result).toEqual([
				{ name: 'v0.200.0 Onwards', value: 3 },
				{ name: 'v0.260.0 Onwards', value: 4 },
			]);
		});

		it('should return only v0.260.0 for row resource and non-specific operations', async () => {
			const mockThis = {
				getNodeParameter: (param: string) => {
					if (param === 'resource') return 'row';
					if (param === 'operation') return 'count'; // Not in ['get', 'search', 'create', 'update', 'delete']
					if (param === 'authentication') return 'nocodb';
					return '';
				},
				getCredentials: (_authenticationMethod: string) => {
					return {
						isCloudNocoDb: false,
					};
				},
			};
			const result = await getApiVersions.call(mockThis as any);
			expect(result).toEqual([{ name: 'v0.260.0 Onwards', value: 4 }]);
		});

		it('should return only v0.260.0 for non-row resource', async () => {
			const mockThis = {
				getNodeParameter: (param: string) => {
					if (param === 'resource') return 'base';
					if (param === 'authentication') return 'nocodb';
					return '';
				},
				getCredentials: (_authenticationMethod: string) => {
					return {
						isCloudNocoDb: false,
					};
				},
			};
			const result = await getApiVersions.call(mockThis as any);
			expect(result).toEqual([{ name: 'v0.260.0 Onwards', value: 4 }]);
		});

		it('should return only v0.260.0 for cloud auth', async () => {
			const mockThis = {
				getNodeParameter: (param: string) => {
					if (param === 'resource') return 'rows';
					if (param === 'operation') return 'get';
					if (param === 'authentication') return 'nocodb';
					return '';
				},
				getCredentials: (_authenticationMethod: string) => {
					return {
						isCloudNocoDb: true,
					};
				},
			};
			const result = await getApiVersions.call(mockThis as any);
			expect(result).toEqual([{ name: 'v0.260.0 Onwards', value: 4 }]);
		});
	});

	describe('getDownloadFields', () => {
		beforeEach(() => {
			mockColumnsFetcher.fetchFromDefinedParam.mockClear();
		});

		it('should return attachment fields for version 4', async () => {
			const mockThis = {
				getNodeParameter: (param: string) => {
					if (param === 'version') return 4;
					return '';
				},
			};

			mockColumnsFetcher.fetchFromDefinedParam.mockResolvedValueOnce([
				{ title: 'Field1', type: 'Attachment', uidt: 'Attachment' },
				{ title: 'Field2', type: 'Text', uidt: 'Text' },
				{ title: 'Field3', type: 'Attachment', uidt: 'Attachment' },
			]);

			const result = await getDownloadFields.call(mockThis as any);
			expect(result).toEqual([
				{ name: 'Field1', value: 'Field1' },
				{ name: 'Field3', value: 'Field3' },
			]);
			expect(mockColumnsFetcher.fetchFromDefinedParam).toHaveBeenCalled();
		});

		it('should return attachment fields for version 3 (using uidt)', async () => {
			const mockThis = {
				getNodeParameter: (param: string) => {
					if (param === 'version') return 3;
					return '';
				},
			};

			mockColumnsFetcher.fetchFromDefinedParam.mockResolvedValueOnce([
				{ title: 'FieldA', type: 'Attachment', uidt: 'Attachment' },
				{ title: 'FieldB', type: 'Number', uidt: 'Number' },
				{ title: 'FieldC', type: 'Attachment', uidt: 'Attachment' },
			]);

			const result = await getDownloadFields.call(mockThis as any);
			expect(result).toEqual([
				{ name: 'FieldA', value: 'FieldA' },
				{ name: 'FieldC', value: 'FieldC' },
			]);
			expect(mockColumnsFetcher.fetchFromDefinedParam).toHaveBeenCalled();
		});

		it('should return empty array if no attachment fields are found', async () => {
			const mockThis = {
				getNodeParameter: (param: string) => {
					if (param === 'version') return 4;
					return '';
				},
			};

			mockColumnsFetcher.fetchFromDefinedParam.mockResolvedValueOnce([
				{ title: 'FieldX', type: 'Text', uidt: 'Text' },
				{ title: 'FieldY', type: 'Number', uidt: 'Number' },
			]);

			const result = await getDownloadFields.call(mockThis as any);
			expect(result).toEqual([]);
			expect(mockColumnsFetcher.fetchFromDefinedParam).toHaveBeenCalled();
		});
	});
});
