import type { IHttpRequestOptions, ILoadOptionsFunctions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { Gong } from '../Gong.node';

describe('Gong list search', () => {
	const setup = () => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getNodeParameter.mockReturnValue('accessToken');
		context.getCredentials.mockResolvedValue({ baseUrl: 'https://api.gong.io/' });
		context.helpers.requestWithAuthentication.mockResolvedValue({
			calls: [],
			users: [],
			records: {},
		});
		return context;
	};

	const requestedUrl = (context: ReturnType<typeof setup>) => {
		const [, options] = context.helpers.requestWithAuthentication.mock.calls[0] as [
			string,
			IHttpRequestOptions,
		];
		return String(options.url);
	};

	it('should request calls from the credentials base URL', async () => {
		const context = setup();

		await new Gong().methods.listSearch.getCalls.call(context);

		expect(requestedUrl(context)).toBe('https://api.gong.io/v2/calls');
	});

	it('should request users from the credentials base URL', async () => {
		const context = setup();

		await new Gong().methods.listSearch.getUsers.call(context);

		expect(requestedUrl(context)).toBe('https://api.gong.io/v2/users');
	});
});
