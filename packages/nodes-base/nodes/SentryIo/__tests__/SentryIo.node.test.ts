import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { SentryIo } from '../SentryIo.node';

describe('SentryIo release version path value', () => {
	const execute = async (typeVersion: number) => {
		const context = mockDeep<IExecuteFunctions>();
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getNode.mockReturnValue({ typeVersion } as INode);
		context.continueOnFail.mockReturnValue(false);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.helpers.returnJsonArray.mockReturnValue([]);
		context.getNodeParameter.mockImplementation((name: string) => {
			const parameters: Record<string, string> = {
				authentication: 'accessToken',
				resource: 'release',
				operation: 'get',
				organizationSlug: 'acme-corp',
				version: 'pkg%401.0.0%2Bbuild',
			};
			return parameters[name];
		});
		context.getCredentials.mockResolvedValue({ token: 'test-token' });

		await new SentryIo().execute.call(context);

		return context.helpers.request.mock.calls[0][0];
	};

	it.each([
		[1, 'https://sentry.io/api/0/organizations/acme-corp/releases/pkg@1.0.0%2Bbuild/'],
		[1.1, 'https://sentry.io/api/0/organizations/acme-corp/releases/pkg%25401.0.0%252Bbuild/'],
	])('should build the URL for node version %s', async (typeVersion, expected) => {
		expect(await execute(typeVersion)).toMatchObject({ uri: { value: expected } });
	});
});
