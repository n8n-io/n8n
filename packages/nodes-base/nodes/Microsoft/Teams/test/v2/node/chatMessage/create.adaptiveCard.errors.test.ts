import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import { versionDescription } from '../../../../v2/actions/versionDescription';
import * as transport from '../../../../v2/transport';
import type * as transportModule from '../../../../v2/transport';
import { createExecuteContext, setParams } from '../helpers';

vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof transportModule>('../../../../v2/transport');
	return {
		...originalModule,
		microsoftApiRequest: vi.fn(),
	};
});

const CHAT_ID = '19:abc@thread.v2';

describe('Test MicrosoftTeamsV2, chatMessage => create adaptive card errors', () => {
	let node: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;
	const apiRequest = transport.microsoftApiRequest as Mock;

	beforeEach(() => {
		vi.clearAllMocks();
		node = new MicrosoftTeamsV2(versionDescription);
		ctx = createExecuteContext();
	});

	const run = async (adaptiveCard: unknown) => {
		setParams(ctx, {
			authentication: 'microsoftTeamsOAuth2Api',
			resource: 'chatMessage',
			operation: 'create',
			chatId: CHAT_ID,
			contentType: 'adaptiveCard',
			adaptiveCard,
		});

		await node.execute.call(ctx);
	};

	const catchError = async (adaptiveCard: unknown): Promise<NodeOperationError> => {
		try {
			await run(adaptiveCard);
		} catch (error) {
			return error as NodeOperationError;
		}

		throw new Error('execute was expected to throw');
	};

	it.each([
		['invalid JSON', '{not json', 'The adaptive card must be valid JSON'],
		['a missing type', { body: [] }, 'The adaptive card must have type "AdaptiveCard"'],
		[
			'an oversize card',
			{ type: 'AdaptiveCard', padding: 'x'.repeat(102400) },
			'The adaptive card is larger than the 100 KB limit',
		],
		[
			'an unsupported action',
			{ type: 'AdaptiveCard', actions: [{ type: 'Action.Submit' }] },
			'The adaptive card contains an unsupported action: Action.Submit',
		],
	])('rejects %s before any request', async (_label, card, message) => {
		const error = await catchError(card);

		expect(error).toBeInstanceOf(NodeOperationError);
		expect(error.message).toBe(message);
		expect(error.context.itemIndex).toBe(0);
		expect(apiRequest).not.toHaveBeenCalled();
	});
});
