import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { onfleetApiRequest } from '../GenericFunctions';
import { Onfleet } from '../Onfleet';

function createContext() {
	const context = mockDeep<IExecuteFunctions>();
	context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key' });
	context.helpers.request.mockResolvedValue({});
	return context;
}

describe('Onfleet.executeRecipientOperations', () => {
	it.each([
		[1.1, 'name', 'John%20Doe', 'name/John%2520Doe'],
		[1.1, 'name', 'John Doe', 'name/John%20Doe'],
		[1.1, 'phone', '%2B14155550123', 'phone/%252B14155550123'],
		[1.1, 'phone', '+14155550123', 'phone/%2B14155550123'],
		[1, 'name', 'John%20Doe', 'name/John%20Doe'],
		[1, 'name', 'John Doe', 'name/John%20Doe'],
		[1, 'phone', '%2B14155550123', 'phone/%2B14155550123'],
		[1, 'phone', '+14155550123', 'phone/%2B14155550123'],
	])(
		'should look up a recipient with node version %s by %s %s at %s',
		async (typeVersion, getBy, value, expectedPath) => {
			const context = createContext();
			context.getNode.mockReturnValue(mock<INode>({ typeVersion }));
			context.getNodeParameter.mockImplementation((name) => (name === 'getBy' ? getBy : value));

			await Onfleet.executeRecipientOperations.call(context, 'recipients', 'get', [{ json: {} }]);

			expect(context.helpers.request).toHaveBeenCalledWith(
				expect.objectContaining({
					uri: expect.objectContaining({
						value: `https://onfleet.com/api/v2/recipients/${expectedPath}`,
					}),
				}),
			);
		},
	);
});

describe('onfleetApiRequest', () => {
	it('should encode path values', async () => {
		const context = createContext();

		const id = 'pH0qbEc4/clone?x=1';
		await onfleetApiRequest.call(context, 'GET', requestPath`tasks/${id}`);

		expect(context.helpers.request).toHaveBeenCalledWith(
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://onfleet.com/api/v2/tasks/pH0qbEc4%2Fclone%3Fx=1',
				}),
			}),
		);
	});
});
