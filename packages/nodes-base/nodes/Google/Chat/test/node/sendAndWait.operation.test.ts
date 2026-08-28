import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import { type INode, SEND_AND_WAIT_OPERATION, type IExecuteFunctions } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { GoogleChat } from '../../GoogleChat.node';
import type { Mock } from 'vitest';
import type * as _importType0 from '../../GenericFunctions';

vi.mock('../../GenericFunctions', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../GenericFunctions');
	return {
		...originalModule,
		googleApiRequest: vi.fn(),
	};
});

describe('Test GoogleChat, message => sendAndWait', () => {
	let googleChat: GoogleChat;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		googleChat = new GoogleChat();
		mockExecuteFunctions = mock<IExecuteFunctions>();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should send message and put execution to wait', async () => {
		const items = [{ json: { data: 'test' } }];
		//node
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(SEND_AND_WAIT_OPERATION);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('spaceID');
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>());
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');

		//getSendAndWaitConfig
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject');
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // approvalOptions
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // options
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval');

		// configureWaitTillDate
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); //options.limitWaitTime.values

		const result = await googleChat.execute.call(mockExecuteFunctions);

		expect(result).toEqual([items]);
		expect(genericFunctions.googleApiRequest).toHaveBeenCalledTimes(1);
		expect(mockExecuteFunctions.putExecutionToWait).toHaveBeenCalledTimes(1);

		expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith('POST', '/v1/spaceID/messages', {
			text: 'my message\n\n\n*<http://localhost/waiting-webhook/nodeID?approved=true&signature=abc|Approve>*\n\n_This_ _message_ _was_ _sent_ _automatically_ _with_ _<https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.googleChat_instanceId|n8n>_',
		});
	});

	it('should route API errors to error output when continueOnFail is true', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(SEND_AND_WAIT_OPERATION);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('spaceID');
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>());
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject');
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval');
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);

		(genericFunctions.googleApiRequest as Mock).mockRejectedValueOnce(new Error('space_not_found'));

		const result = await googleChat.execute.call(mockExecuteFunctions);

		expect(result).toEqual([[{ json: { error: 'space_not_found' } }]]);
		expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
	});

	it('should rethrow API errors when continueOnFail is false', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(SEND_AND_WAIT_OPERATION);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('spaceID');
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>());
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message');
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject');
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({});
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval');
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		(genericFunctions.googleApiRequest as Mock).mockRejectedValueOnce(new Error('space_not_found'));

		await expect(googleChat.execute.call(mockExecuteFunctions)).rejects.toThrow('space_not_found');
		expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
	});
});
