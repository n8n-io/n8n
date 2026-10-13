import {
	NodeApiError,
	NodeOperationError,
	type IExecuteFunctions,
	type INode,
	type JsonObject,
} from 'n8n-workflow';
import type { Mock } from 'vitest';
import type { MockProxy } from 'vitest-mock-extended';

import { createExecuteContext, setParams } from '../helpers';
import { versionDescription } from '../../../../v2/actions/versionDescription';
import { MicrosoftTeamsV2 } from '../../../../v2/MicrosoftTeamsV2.node';
import { microsoftApiRequest, SERVICE_PRINCIPAL_AUTH } from '../../../../v2/transport';
import {
	ACTIVITY_PERMISSION_FORBIDDEN,
	COMPANION_APP_FORBIDDEN,
} from '../../../../v2/transport/forbiddenHints';

const RECIPIENT = '11111111-2222-3333-4444-555555555555';
const LEAK = 'request-id: 99999999-8888-7777-6666-555555555555; token=secret';
const COMPANION_TEXT = `Application with AAD App Id '22222222-2222-2222-2222-222222222222' is not authorized to generate custom text notifications about '/users/${RECIPIENT}/teamwork/sendActivityNotification' to the recipient. Ensure that the expected Teams app is installed in the target scope (user, team, or chat).`;
const SCOPE_PERMISSION_TEXT =
	"Missing scope permissions on the request. API requires one of 'TeamsActivity.Send'. Scopes on the request 'Chat.ReadWrite, ChannelMessage.Send, User.Read, offline_access'.";
const ROLE_PERMISSION_TEXT =
	"Missing role permissions on the request. API requires one of 'TeamsActivity.Send, TeamsActivity.Send.User'. Roles on the request ''. Resource specific consent grants on the request ''.";
const CHANNELS_ROLE_TEXT =
	"Missing role permissions on the request. API requires one of 'Channel.ReadBasic.All, ChannelSettings.Read.All, ChannelSettings.ReadWrite.All'. Roles on the request 'TeamsActivity.Send, User.Read.All'. Resource specific consent grants on the request ''.";
const CHANNELS_SCOPE_TEXT =
	"Missing scope permissions on the request. API requires one of 'Channel.ReadBasic.All, ChannelSettings.Read.All, ChannelSettings.ReadWrite.All'. Scopes on the request 'TeamsActivity.Send, User.Read, offline_access'.";
const CHANNELS_PATH = '/v1.0/teams/11111111-2222-3333-4444-555555555555/channels';
const OTHER_TEXT = 'Insufficient privileges to complete the operation.';
const GENERIC_APP_ONLY_403 =
	'The app registration is missing a consented application permission for this operation. Grant the required Graph application permission and admin consent, then retry.';

const node: INode = {
	id: 'teams-node',
	name: 'Microsoft Teams',
	type: 'n8n-nodes-base.microsoftTeams',
	typeVersion: 2,
	position: [0, 0],
	parameters: {},
};

const graphError = (statusCode: number, code: string, message: string) =>
	Object.assign(new Error(`${statusCode} - ${JSON.stringify({ error: { code, message } })}`), {
		statusCode,
		error: { error: { code, message } },
	});

describe('Microsoft Teams V2 - activityNotification:send error surfacing', () => {
	let teams: MicrosoftTeamsV2;
	let ctx: MockProxy<IExecuteFunctions>;
	let requestOAuth2: Mock;
	let requestWithAuthentication: Mock;

	const executeAndCatch = async () => {
		try {
			await teams.execute.call(ctx);
		} catch (error) {
			return error as NodeApiError | NodeOperationError;
		}
		throw new Error('execute was expected to throw');
	};

	const configure = (authentication: string) => {
		setParams(ctx, {
			authentication,
			resource: 'activityNotification',
			operation: 'send',
			recipientId: RECIPIENT,
			headline: 'Approval needed',
			previewText: 'Order #4711 needs approval',
			topic: 'n8n workflow run',
			topicLink: 'https://teams.microsoft.com/l/chat/0/0?users=someone@contoso.com',
			options: {},
		});
	};

	beforeEach(() => {
		vi.clearAllMocks();
		teams = new MicrosoftTeamsV2(versionDescription);
		ctx = createExecuteContext();
		ctx.getNode.mockReturnValue(node);
		ctx.getCredentials.mockResolvedValue({ graphApiBaseUrl: '' });
		requestOAuth2 = vi.fn();
		requestWithAuthentication = vi.fn();
		ctx.helpers.requestOAuth2 = requestOAuth2;
		ctx.helpers.requestWithAuthentication = requestWithAuthentication;
	});

	describe.each(['microsoftTeamsOAuth2Api', 'microsoftOAuth2Api'])(
		'under the %s credential',
		(authentication) => {
			beforeEach(() => {
				configure(authentication);
			});

			it('maps the companion-app 403 to the install message with the setup description', async () => {
				requestOAuth2.mockRejectedValue(graphError(403, 'Forbidden', COMPANION_TEXT));

				const error = await executeAndCatch();

				expect(error).toBeInstanceOf(NodeApiError);
				expect((error as NodeApiError).httpCode).toBe('403');
				expect(error.message).toBe(COMPANION_APP_FORBIDDEN.message);
				expect(error.description).toBe(COMPANION_APP_FORBIDDEN.description);
				expect(error.messages.join(' ')).toContain(COMPANION_TEXT);
				expect(error.context.itemIndex).toBe(0);
				expect(requestWithAuthentication).not.toHaveBeenCalled();
			});

			it('maps the missing-permission 403 to the reconnect message', async () => {
				requestOAuth2.mockRejectedValue(graphError(403, 'Forbidden', SCOPE_PERMISSION_TEXT));

				const error = await executeAndCatch();

				expect(error).toBeInstanceOf(NodeApiError);
				expect((error as NodeApiError).httpCode).toBe('403');
				expect(error.message).toBe(ACTIVITY_PERMISSION_FORBIDDEN.delegated.message);
				expect(error.description).toBe(ACTIVITY_PERMISSION_FORBIDDEN.delegated.description);
				expect(error.messages.join(' ')).toContain(SCOPE_PERMISSION_TEXT);
				expect(error.context.itemIndex).toBe(0);
			});

			it('keeps the Graph text when another endpoint names TeamsActivity.Send in its 403', async () => {
				requestOAuth2.mockRejectedValue(graphError(403, 'Forbidden', CHANNELS_SCOPE_TEXT));

				const error = (await microsoftApiRequest
					.call(ctx, 'GET', CHANNELS_PATH)
					.catch((e: unknown) => e)) as NodeApiError;

				expect(error).toBeInstanceOf(NodeApiError);
				expect(error.message).toBe(CHANNELS_SCOPE_TEXT);
			});

			it('keeps any other 403 text unchanged', async () => {
				requestOAuth2.mockRejectedValue(graphError(403, 'Forbidden', OTHER_TEXT));

				const error = await executeAndCatch();

				expect(error).toBeInstanceOf(NodeApiError);
				expect(error.message).toBe(OTHER_TEXT);
			});

			it('rewrites a 404 to the recipient-not-found message', async () => {
				requestOAuth2.mockRejectedValue(
					graphError(404, 'Request_ResourceNotFound', 'Resource does not exist.'),
				);

				const error = await executeAndCatch();

				expect(error).toBeInstanceOf(NodeOperationError);
				expect(error.message).toBe('The recipient was not found');
				expect(error.context.itemIndex).toBe(0);
			});

			it('stamps the failing item index on a 403 in a multi-item run', async () => {
				ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
				requestOAuth2
					.mockResolvedValueOnce(undefined)
					.mockRejectedValueOnce(graphError(403, 'Forbidden', COMPANION_TEXT));

				const error = await executeAndCatch();

				expect(error.message).toBe(COMPANION_APP_FORBIDDEN.message);
				expect(error.context.itemIndex).toBe(1);
				expect(requestOAuth2).toHaveBeenCalledTimes(2);
			});

			it('stamps the failing item index on a 404 in a multi-item run', async () => {
				ctx.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
				requestOAuth2
					.mockResolvedValueOnce(undefined)
					.mockRejectedValueOnce(
						graphError(404, 'Request_ResourceNotFound', 'Resource does not exist.'),
					);

				const error = await executeAndCatch();

				expect(error.message).toBe('The recipient was not found');
				expect(error.context.itemIndex).toBe(1);
			});
		},
	);

	describe('under the Service Principal credential', () => {
		const wrapped = (statusCode: number, code: string, message: string) =>
			new NodeApiError(node, graphError(statusCode, code, message) as unknown as JsonObject);

		beforeEach(() => {
			configure(SERVICE_PRINCIPAL_AUTH);
		});

		it('maps the companion-app 403 to the install message and leaks nothing from the body', async () => {
			requestWithAuthentication.mockRejectedValue(
				wrapped(403, 'Forbidden', `${COMPANION_TEXT} ${LEAK}`),
			);

			const error = await executeAndCatch();

			expect(error).toBeInstanceOf(NodeApiError);
			expect((error as NodeApiError).httpCode).toBe('403');
			expect(error.message).toBe(COMPANION_APP_FORBIDDEN.message);
			expect(error.description).toBe(COMPANION_APP_FORBIDDEN.description);
			for (const text of [
				error.message,
				error.description,
				...error.messages,
				JSON.stringify(error),
			]) {
				expect(text).not.toContain('request-id');
				expect(text).not.toContain('token=');
			}
			expect(requestOAuth2).not.toHaveBeenCalled();
		});

		it('maps the missing-permission 403 to the application-permission message', async () => {
			requestWithAuthentication.mockRejectedValue(wrapped(403, 'Forbidden', ROLE_PERMISSION_TEXT));

			const error = await executeAndCatch();

			expect(error.message).toBe(ACTIVITY_PERMISSION_FORBIDDEN.message);
			expect(error.description).toBe(ACTIVITY_PERMISSION_FORBIDDEN.description);
			expect(error.context.itemIndex).toBe(0);
		});

		it('keeps the generic app-only 403 when another endpoint lists TeamsActivity.Send among the granted roles', async () => {
			requestWithAuthentication.mockRejectedValue(wrapped(403, 'Forbidden', CHANNELS_ROLE_TEXT));

			const error = (await microsoftApiRequest
				.call(ctx, 'GET', CHANNELS_PATH)
				.catch((e: unknown) => e)) as NodeApiError;

			expect(error.message).toBe(GENERIC_APP_ONLY_403);
			expect(error.description).toBeUndefined();
		});

		it('keeps the generic app-only 403 message for any other text', async () => {
			requestWithAuthentication.mockRejectedValue(wrapped(403, 'Forbidden', OTHER_TEXT));

			const error = await executeAndCatch();

			expect(error.message).toBe(GENERIC_APP_ONLY_403);
			expect(error.description).toBeUndefined();
		});

		it('rewrites a 404 to the recipient-not-found message', async () => {
			requestWithAuthentication.mockRejectedValue(
				wrapped(404, 'Request_ResourceNotFound', 'Resource does not exist.'),
			);

			const error = await executeAndCatch();

			expect(error).toBeInstanceOf(NodeOperationError);
			expect(error.message).toBe('The recipient was not found');
		});
	});
});
