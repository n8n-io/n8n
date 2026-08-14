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

	const setupParameters = (overrides: Record<string, unknown> = {}) => {
		const params: Record<string, unknown> = {
			resource: 'message',
			operation: SEND_AND_WAIT_OPERATION,
			sendTo: 'to@mail.com',
			message: 'my message',
			subject: 'my subject',
			'approvalOptions.values': {},
			options: {},
			responseType: 'approval',
			...overrides,
		};
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(parameterName: string, _itemIndex?: unknown, fallback?: any) =>
				params[parameterName] ?? fallback,
		);
		mockExecuteFunctions.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.2 }));
		mockExecuteFunctions.getInstanceId.mockReturnValue('instanceId');
		mockExecuteFunctions.getSignedResumeUrl.mockReturnValue(
			'http://localhost/waiting-webhook/nodeID?approved=true&signature=abc',
		);
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

	it('should send the raw email and wait', async () => {
		const items = [{ json: { data: 'test' } }];
		mockExecuteFunctions.getInputData.mockReturnValue(items);
		setupParameters();

		(genericFunctions.googleApiRequest as Mock).mockResolvedValueOnce({});

		const result = await gmail.execute.call(mockExecuteFunctions);

		expect(genericFunctions.googleApiRequest).toHaveBeenCalledWith(
			'POST',
			'/gmail/v1/users/me/messages/send',
			{ raw: expect.any(String) },
		);
		expect(mockExecuteFunctions.putExecutionToWait).toHaveBeenCalled();
		expect(result).toEqual([items]);
	});
});
