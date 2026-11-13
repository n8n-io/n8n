import { mock, mockDeep } from 'vitest-mock-extended';
import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';

import { GoogleFirebaseRealtimeDatabase } from '../GoogleFirebaseRealtimeDatabase.node';

describe('GoogleFirebaseRealtimeDatabase > getProjects', () => {
	it('should list projects from the Firebase management API', async () => {
		const loadOptionsFunctions = mockDeep<ILoadOptionsFunctions>();
		loadOptionsFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 1.1 }));
		loadOptionsFunctions.getCredentials.mockResolvedValue({ region: 'firebaseio.com' });
		loadOptionsFunctions.helpers.requestOAuth2.mockResolvedValue({
			results: [
				{
					projectId: 'acme-shop',
					resources: { realtimeDatabaseInstance: 'acme-shop-default-rtdb' },
				},
				{ projectId: 'acme-hosting', resources: {} },
			],
		});

		const projects =
			await new GoogleFirebaseRealtimeDatabase().methods.loadOptions.getProjects.call(
				loadOptionsFunctions,
			);

		expect(projects).toEqual([{ name: 'acme-shop', value: 'acme-shop-default-rtdb' }]);
		const [, options] = loadOptionsFunctions.helpers.requestOAuth2.mock.calls[0];
		expect(String(options.url)).toBe('https://firebase.googleapis.com/v1beta1/projects');
		expect(options.qs).toEqual({ pageSize: 100 });
	});
});
