import type { IExecuteFunctions, INode, NodeParameterValueType } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import { versionDescription } from '../../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import * as transport from '../../../../v2/transport';
import type * as _importType0 from '../../../../v2/transport';

// Real transport except the network helper, so buildTeamsPath/validateTeamsId
// run for real; only microsoftApiRequest is stubbed.
vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

describe('Microsoft Teams V2 — chatMessage:get error surfacing', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	const setParams = (params: Record<string, unknown>) => {
		ctx.getNodeParameter.mockImplementation(
			(name: string, _itemIndex?: number, fallback?: unknown): NodeParameterValueType =>
				(name in params ? params[name] : fallback) as NodeParameterValueType,
		);
	};

	beforeEach(() => {
		vi.clearAllMocks();
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = mock<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.getInstanceId.mockReturnValue('instanceId');
		ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2 }));
		ctx.continueOnFail.mockReturnValue(false);
	});

	it('surfaces the validation error for a malformed message ID', async () => {
		setParams({
			authentication: 'microsoftTeamsOAuth2Api',
			resource: 'chatMessage',
			operation: 'get',
			chatId: '19:abc@thread.v2',
			messageId: 'a/b',
		});

		await expect(node.execute.call(ctx)).rejects.toThrow('The ID is not valid');
		expect(apiRequest).not.toHaveBeenCalled();
	});

	it('keeps the not-found message for request failures', async () => {
		setParams({
			authentication: 'microsoftTeamsOAuth2Api',
			resource: 'chatMessage',
			operation: 'get',
			chatId: '19:abc@thread.v2',
			messageId: '1698378560692',
		});
		apiRequest.mockRejectedValueOnce(new Error('404'));

		await expect(node.execute.call(ctx)).rejects.toThrow(
			"The message you are trying to get doesn't exist",
		);
	});
});
