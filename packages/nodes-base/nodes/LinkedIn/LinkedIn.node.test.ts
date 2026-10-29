import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import * as GenericFunctions from './GenericFunctions';
import { LinkedIn } from './LinkedIn.node';

vi.mock('./GenericFunctions');

describe('LinkedIn node', () => {
	const node = mock<INode>({
		id: 'linked-in-node',
		name: 'LinkedIn',
		type: 'n8n-nodes-base.linkedIn',
		typeVersion: 1,
	});
	const linkedInApiRequest = vi.mocked(GenericFunctions.linkedInApiRequest);
	let executeFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		vi.clearAllMocks();
		executeFunctions = mock<IExecuteFunctions>({
			helpers: {
				constructExecutionMetaData: vi.fn(() => []),
				returnJsonArray: vi.fn(() => []),
			},
		});
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNode.mockReturnValue(node);
		executeFunctions.getNodeParameter.calledWith('resource', 0).mockReturnValue('post');
		executeFunctions.getNodeParameter.calledWith('operation', 0).mockReturnValue('create');
		executeFunctions.getNodeParameter.calledWith('shareMediaCategory', 0).mockReturnValue('NONE');
		executeFunctions.getNodeParameter.calledWith('postAs', 0).mockReturnValue('person');
		executeFunctions.getNodeParameter.calledWith('additionalFields', 0).mockReturnValue({});
		executeFunctions.getNodeParameter.calledWith('person', 0).mockReturnValue('person-id');
		executeFunctions.continueOnFail.mockReturnValue(false);
		linkedInApiRequest.mockResolvedValue({ urn: 'post-id' });
	});

	it('escapes special characters in post text', async () => {
		executeFunctions.getNodeParameter.calledWith('text', 0).mockReturnValue('Hello @world');

		await new LinkedIn().execute.call(executeFunctions);

		expect(linkedInApiRequest).toHaveBeenCalledWith(
			'POST',
			'/posts',
			expect.objectContaining({ commentary: 'Hello \\@world' }),
		);
	});

	it('rejects undefined post text before making an API request', async () => {
		executeFunctions.getNodeParameter.calledWith('text', 0).mockReturnValue(undefined);

		await expect(new LinkedIn().execute.call(executeFunctions)).rejects.toThrow(
			'Parameter "text" is not string',
		);
		expect(linkedInApiRequest).not.toHaveBeenCalled();
	});

	it('rejects empty post text before making an API request', async () => {
		executeFunctions.getNodeParameter.calledWith('text', 0).mockReturnValue('');

		await expect(new LinkedIn().execute.call(executeFunctions)).rejects.toThrow(
			'The Text field is empty. Enter text to publish the post.',
		);
		expect(linkedInApiRequest).not.toHaveBeenCalled();
	});
});
