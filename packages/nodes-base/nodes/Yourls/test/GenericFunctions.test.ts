import type { IExecuteFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { yourlsApiRequest } from '../GenericFunctions';

describe('Yourls, yourlsApiRequest', () => {
	const setup = () => {
		const request = vi.fn().mockResolvedValue({ status: 'success' });
		const ctx = mock<IExecuteFunctions>();
		ctx.getCredentials.mockResolvedValue({
			url: 'https://short.example.com',
			signature: 'sig123',
		});
		ctx.helpers = { ...ctx.helpers, request };
		return { ctx, request };
	};

	it('does not send a body when none is given, even though it defaults to {}', async () => {
		// Every call this node makes is a GET with all its data in the query string. Sending an
		// (empty) JSON body on a GET request is unusual enough that some reverse proxies/WAFs in
		// front of a self-hosted YOURLS instance reject it, even though YOURLS itself ignores it.
		const { ctx, request } = setup();

		await yourlsApiRequest.call(ctx, 'GET', {}, { action: 'shorturl', url: 'https://a.example' });

		const options = request.mock.calls[0][0];
		expect(options).not.toHaveProperty('body');
	});

	it('still sends a body when one is explicitly provided', async () => {
		const { ctx, request } = setup();

		await yourlsApiRequest.call(ctx, 'POST', { some: 'payload' }, {});

		const options = request.mock.calls[0][0];
		expect(options.body).toEqual({ some: 'payload' });
	});
});
