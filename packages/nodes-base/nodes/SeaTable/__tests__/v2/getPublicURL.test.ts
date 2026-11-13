import { mock } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { requestUrl } from 'n8n-workflow';

import { execute } from '../../v2/actions/asset/getPublicURL.operation';

describe('Seatable > v2 > asset > getPublicURL', () => {
	const run = async (assetPath: string, typeVersion: number) => {
		const httpRequest = vi
			.fn()
			.mockResolvedValue({ access_token: 'fake-base-token', dtable_uuid: 'b7e5c1d2' });
		const requestWithAuthentication = vi.fn().mockResolvedValue({});
		const context = mock<IExecuteFunctions>({
			helpers: { httpRequest, requestWithAuthentication, returnJsonArray: vi.fn() },
		});
		context.getNodeParameter.mockReturnValue(assetPath);
		context.getNode.mockReturnValue(mock<INode>({ typeVersion }));
		context.getCredentials.mockResolvedValue({
			environment: 'selfHosted',
			domain: 'https://seatable.example.com',
			token: 'fake-api-token',
		});

		await execute.call(context, 0);
		return requestWithAuthentication;
	};

	it.each([
		[2, '/images/2024-05/logo?.png', '/images/2024-05/logo?.png'],
		[2, '/images/my%20logo.png', '/images/my logo.png'],
		[2, '/images/my logo.png', '/images/my logo.png'],
		[2, '/images/100%.png', '/images/100%.png'],
		[2.1, '/images/2024-05/logo?.png', '/images/2024-05/logo?.png'],
		[2.1, '/images/my%20logo.png', '/images/my%20logo.png'],
		[2.1, '/images/my logo.png', '/images/my logo.png'],
		[2.1, '/images/100%.png', '/images/100%.png'],
	])(
		'should send asset path of version %s %s as query value %s',
		async (typeVersion, assetPath, expected) => {
			const requestWithAuthentication = await run(assetPath, typeVersion);

			expect(requestWithAuthentication).toHaveBeenCalledWith(
				'seaTableApi',
				expect.objectContaining({
					uri: requestUrl`https://seatable.example.com/api/v2.1/dtable/app-download-link/`,
					qs: { path: expected },
				}),
			);
		},
	);

	it.each([2, 2.1])(
		'should send no request for an empty asset path of version %s',
		async (typeVersion) => {
			const requestWithAuthentication = await run('', typeVersion);

			expect(requestWithAuthentication).not.toHaveBeenCalled();
		},
	);
});
