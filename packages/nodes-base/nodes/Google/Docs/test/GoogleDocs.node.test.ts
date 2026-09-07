import type { IDataObject, ILoadOptionsFunctions } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { googleApiRequestAllItems } from '../GenericFunctions';
import { GoogleDocs } from '../GoogleDocs.node';

vi.mock('../GenericFunctions', () => ({
	googleApiRequestAllItems: vi.fn(),
}));

const node = new GoogleDocs();

let nodeParameters: Record<string, unknown>;

const mockThis = {
	getNode: () => ({ name: 'Google Docs', parameters: {} }),
	getNodeParameter: vi.fn((name: string, ...rest: unknown[]) => {
		if (nodeParameters[name] !== undefined) return nodeParameters[name];
		if (rest.length === 0) {
			throw new Error(`Could not get parameter "${name}"`);
		}
		return rest[0];
	}),
} as unknown as ILoadOptionsFunctions;

const getRequestedQuery = () => (googleApiRequestAllItems as Mock).mock.calls[0][4] as IDataObject;

describe('GoogleDocs Node - loadOptions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		nodeParameters = {};
	});

	describe('getFolders', () => {
		it('should use myDrive when driveId is absent from node parameters', async () => {
			(googleApiRequestAllItems as Mock).mockResolvedValue([{ name: 'Reports', id: 'folder-1' }]);

			const result = await node.methods.loadOptions.getFolders.call(mockThis);

			expect(mockThis.getNodeParameter).toHaveBeenCalledWith('driveId', 'myDrive');
			expect(result).toEqual([
				{ name: '/', value: 'default' },
				{ name: 'Reports', value: 'folder-1' },
			]);
			const qs = getRequestedQuery();
			expect(qs.q).toContain("'root' in parents");
			expect(qs.driveId).toBeUndefined();
		});

		it('should query the selected shared drive', async () => {
			nodeParameters = { driveId: 'drive-123' };
			(googleApiRequestAllItems as Mock).mockResolvedValue([]);

			await node.methods.loadOptions.getFolders.call(mockThis);

			expect(getRequestedQuery().driveId).toBe('drive-123');
		});
	});
});
