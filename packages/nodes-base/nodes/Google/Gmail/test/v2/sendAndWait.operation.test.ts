import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';
import {
	type INode,
	type INodeTypeBaseDescription,
	SEND_AND_WAIT_OPERATION,
	type IExecuteFunctions,
} from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { GmailV2 } from '../../v2/GmailV2.node';
import type { Mock } from 'vitest';
import type * as _importType0 from '../../GenericFunctions';

vi.mock('../../GenericFunctions', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../GenericFunctions');
	return {
		...originalModule,
		googleApiRequest: vi.fn(),
	};
});

describe('Test GmailV2, message => sendAndWait', () => {
	let gmail: GmailV2;
	let mockExecuteFunctions: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		gmail = new GmailV2(mock<INodeTypeBaseDescription>());
		mockExecuteFunctions = mock<IExecuteFunctions>();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const setupParameters = () => {
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('message'); // resource
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce(SEND_AND_WAIT_OPERATION); // operation
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.2 }));
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');

		// createEmail
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('to@mail.com'); // sendTo
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my message'); // message
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('my subject'); // subject
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // approvalOptions
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // options
		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce('approval'); // responseType

		mockExecuteFunctions.getNodeParameter.mockReturnValueOnce({}); // configureWaitTillDate
	};

	it('should route API errors to error output when continueOnFail is true', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		setupParameters();
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);

		(genericFunctions.googleApiRequest as Mock).mockRejectedValueOnce(
			new Error('invalid_recipient'),
		);

		const result = await gmail.execute.call(mockExecuteFunctions);

		expect(result).toEqual([[{ json: { error: 'invalid_recipient' } }]]);
		expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
	});

	it('should rethrow API errors when continueOnFail is false', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		setupParameters();
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);

		(genericFunctions.googleApiRequest as Mock).mockRejectedValueOnce(
			new Error('invalid_recipient'),
		);

		await expect(gmail.execute.call(mockExecuteFunctions)).rejects.toThrow('invalid_recipient');
		expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
	});
});
