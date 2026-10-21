import {
	NodeApiError,
	type IExecuteFunctions,
	type IHookFunctions,
	type INode,
	type JsonObject,
} from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

import { createExecuteContext, setParams } from '../v2/node/helpers';
import { createSubscription } from '../../v2/helpers/utils-trigger';
import { SERVICE_PRINCIPAL_AUTH } from '../../v2/transport';
import { SUBSCRIPTION_LIMIT_FORBIDDEN } from '../../v2/transport/forbiddenHints';

const LIMIT_TEXT =
	"Operation: Create; Exception: [Status Code: Forbidden; Reason: User 'u' has reached its limit of '1' 'TEAMS/T/CHANNELS' subscription on tenant 't'.]";
const OTHER_TEXT = 'Insufficient privileges to complete the operation.';
const GENERIC_APP_ONLY_403 =
	'The app registration is missing a consented application permission for this operation. Grant the required Graph application permission and admin consent, then retry.';

const node: INode = {
	id: 'teams-trigger',
	name: 'Microsoft Teams Trigger',
	type: 'n8n-nodes-base.microsoftTeamsTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const graphError = (statusCode: number, code: string, message: string) =>
	Object.assign(new Error(`${statusCode} - ${JSON.stringify({ error: { code, message } })}`), {
		statusCode,
		error: { error: { code, message } },
	});

describe('Microsoft Teams Trigger - createSubscription error surfacing', () => {
	let ctx: MockProxy<IExecuteFunctions>;
	let requestOAuth2: Mock;
	let requestWithAuthentication: Mock;

	const createAndCatch = async () => {
		try {
			await createSubscription.call(
				ctx as unknown as IHookFunctions,
				'https://webhook.url',
				'/teams/t/channels',
				'secret',
			);
		} catch (error) {
			return error as NodeApiError;
		}
		throw new Error('createSubscription was expected to throw');
	};

	beforeEach(() => {
		vi.clearAllMocks();
		ctx = createExecuteContext();
		ctx.getNode.mockReturnValue(node);
		ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
		requestOAuth2 = vi.fn();
		requestWithAuthentication = vi.fn();
		ctx.helpers.requestOAuth2 = requestOAuth2;
		ctx.helpers.requestWithAuthentication = requestWithAuthentication;
	});

	describe('under the delegated credential', () => {
		beforeEach(() => {
			setParams(ctx, { authentication: 'microsoftTeamsOAuth2Api' });
		});

		it('maps the Graph limit 403 to the limit hint', async () => {
			requestOAuth2.mockRejectedValue(graphError(403, 'ExtensionError', LIMIT_TEXT));

			const error = await createAndCatch();

			expect(error).toBeInstanceOf(NodeApiError);
			expect(error.message).toBe(SUBSCRIPTION_LIMIT_FORBIDDEN.message);
			expect(error.description).toBe(SUBSCRIPTION_LIMIT_FORBIDDEN.description);
			expect(requestWithAuthentication).not.toHaveBeenCalled();
		});

		it('keeps the Graph text for another 403 on /subscriptions', async () => {
			requestOAuth2.mockRejectedValue(graphError(403, 'Forbidden', OTHER_TEXT));

			const error = await createAndCatch();

			expect(error).toBeInstanceOf(NodeApiError);
			expect(error.message).toBe(OTHER_TEXT);
			expect(error.description).toBeUndefined();
		});
	});

	describe('under the Service Principal credential', () => {
		const wrapped = (statusCode: number, code: string, message: string) =>
			new NodeApiError(node, graphError(statusCode, code, message) as unknown as JsonObject);

		beforeEach(() => {
			setParams(ctx, { authentication: SERVICE_PRINCIPAL_AUTH });
		});

		it('maps the Graph limit 403 to the limit hint', async () => {
			requestWithAuthentication.mockRejectedValue(wrapped(403, 'ExtensionError', LIMIT_TEXT));

			const error = await createAndCatch();

			expect(error).toBeInstanceOf(NodeApiError);
			expect(error.httpCode).toBe('403');
			expect(error.message).toBe(SUBSCRIPTION_LIMIT_FORBIDDEN.message);
			expect(error.description).toBe(SUBSCRIPTION_LIMIT_FORBIDDEN.description);
			expect(requestOAuth2).not.toHaveBeenCalled();
		});

		it('keeps the generic app-only copy for another 403 on /subscriptions', async () => {
			requestWithAuthentication.mockRejectedValue(wrapped(403, 'Forbidden', OTHER_TEXT));

			const error = await createAndCatch();

			expect(error.message).toBe(GENERIC_APP_ONLY_403);
			expect(error.description).toBeUndefined();
		});
	});
});
