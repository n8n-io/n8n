import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

import { versionDescription } from '../../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import * as transport from '../../../../v2/transport';
import type * as _importType0 from '../../../../v2/transport';
import { createExecuteContext, setParams } from '../helpers';

vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

describe('Microsoft Teams V2, chat get', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;

	beforeEach(() => {
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = createExecuteContext();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	const run = async (chatId: string) => {
		setParams(ctx, { resource: 'chat', operation: 'get', chatId });
		return await node.execute.call(ctx);
	};

	it('rejects a separator-bearing chat ID before any request', async () => {
		await expect(run('x/../../users/me')).rejects.toThrow('The ID is not valid');
		expect(transport.microsoftApiRequest).not.toHaveBeenCalled();
	});

	it('replaces a Graph 404 with the chat not-found message', async () => {
		(transport.microsoftApiRequest as Mock).mockRejectedValue(
			new NodeApiError(ctx.getNode(), { message: 'Not Found' }, { httpCode: '404' }),
		);

		await expect(run('19:ebed9ad42c904d6c83adf0db360053ec@thread.v2')).rejects.toThrow(
			"The chat you are trying to get doesn't exist",
		);
	});

	it('rethrows a non-404 Graph error unchanged', async () => {
		(transport.microsoftApiRequest as Mock).mockRejectedValue(
			new NodeApiError(
				ctx.getNode(),
				{ message: 'Insufficient privileges to complete the operation' },
				{ httpCode: '403', message: 'Insufficient privileges to complete the operation' },
			),
		);

		await expect(run('19:ebed9ad42c904d6c83adf0db360053ec@thread.v2')).rejects.toThrow(
			'Insufficient privileges to complete the operation',
		);
	});
});
