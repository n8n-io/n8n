import { mock, mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { handleMatrixCall, matrixApiRequest } from '../GenericFunctions';

function createContext() {
	const context = mockDeep<IExecuteFunctions>();
	context.getCredentials.mockResolvedValue({
		homeserverUrl: 'https://matrix.example.com',
		accessToken: 'fake-access-token',
	});
	context.helpers.request.mockResolvedValue({});
	return context;
}

describe('handleMatrixCall', () => {
	it.each([
		[1.1, '%23room:example.com', '%2523room:example.com'],
		[1.1, '#room:example.com', '%23room:example.com'],
		[1.1, '#a+b:example.com', '%23a%2Bb:example.com'],
		[1, '%23room:example.com', '%23room:example.com'],
		[1, '#room:example.com', '%23room:example.com'],
	])(
		'version %s should send room %s to the join URL as %s',
		async (typeVersion, roomIdOrAlias, expected) => {
			const context = createContext();
			context.getNode.mockReturnValue(mock<INode>({ typeVersion }));
			context.getNodeParameter.mockReturnValue(roomIdOrAlias);

			await handleMatrixCall.call(context, 0, 'room', 'join');

			expect(context.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					uri: expect.objectContaining({
						value: `https://matrix.example.com/_matrix/client/r0/rooms/${expected}/join`,
					}),
				}),
			);
		},
	);

	it.each([
		[1.1, '%2521abc123%253Aexample.com', '%2524evt1%253Aexample.com'],
		[1, '!abc123:example.com', '$evt1:example.com'],
	])(
		'version %s should send the event:get room and event IDs as %s and %s',
		async (typeVersion, expectedRoom, expectedEvent) => {
			const context = createContext();
			context.getNode.mockReturnValue(mock<INode>({ typeVersion }));
			context.getNodeParameter.mockImplementation((name: string) =>
				name === 'roomId' ? '%21abc123%3Aexample.com' : '%24evt1%3Aexample.com',
			);

			await handleMatrixCall.call(context, 0, 'event', 'get');

			expect(context.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					uri: expect.objectContaining({
						value: `https://matrix.example.com/_matrix/client/r0/rooms/${expectedRoom}/event/${expectedEvent}`,
					}),
				}),
			);
		},
	);
});

describe('matrixApiRequest', () => {
	it('should encode path values and join them with the homeserver URL', async () => {
		const context = createContext();

		const roomId = '!abc123:example.com/leave?x=1';
		await matrixApiRequest.call(context, 'POST', requestPath`/rooms/${roomId}/join`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value:
						'https://matrix.example.com/_matrix/client/r0/rooms/!abc123:example.com%2Fleave%3Fx=1/join',
				}),
			}),
		);
	});
});
