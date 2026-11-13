import { mockDeep } from 'jest-mock-extended';
import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';

import { Tapfiliate } from '../Tapfiliate.node';

describe('Tapfiliate metadata key', () => {
	const run = async (typeVersion: number, operation: 'add' | 'remove') => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue({ typeVersion } as INode);
		context.getInputData.mockReturnValue([{ json: {} }]);
		context.getCredentials.mockResolvedValue({ apiKey: 'fake-api-key' });
		context.helpers.request.mockResolvedValue({});
		context.helpers.returnJsonArray.mockReturnValue([]);
		context.helpers.constructExecutionMetaData.mockReturnValue([]);
		context.getNodeParameter.mockImplementation((name: string) => {
			const parameters: IDataObject = {
				resource: 'affiliateMetadata',
				operation,
				affiliateId: 'nathanexample',
				key: 'my%20key',
				metadataUi: { metadataValues: [{ key: 'my%20key', value: 'gold' }] },
			};
			return parameters[name];
		});

		await new Tapfiliate().execute.call(context);

		return (context.helpers.request.mock.calls[0][0] as { uri: { value: string } }).uri.value;
	};

	it.each([
		[1, 'add', 'my%20key'],
		[1, 'remove', 'my%20key'],
		[1.1, 'add', 'my%2520key'],
		[1.1, 'remove', 'my%2520key'],
	] as const)('should send the key in version %s %s as %s', async (version, operation, segment) => {
		expect(await run(version, operation)).toBe(
			`https://api.tapfiliate.com/1.6/affiliates/nathanexample/meta-data/${segment}/`,
		);
	});
});
