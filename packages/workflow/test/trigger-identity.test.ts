import {
	CHAT_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_CHAT_TRIGGER_LANGCHAIN_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	MCP_TRIGGER_NODE_TYPE,
} from '../src/constants';
import { classifyTriggerIdentity } from '../src/trigger-identity';

const hooksParameters = {
	executionsHooksVersion: 1,
	contextEstablishmentHooks: { hooks: [{ hookName: 'credentials.bearerToken' }] },
};

describe('classifyTriggerIdentity', () => {
	it.each([MANUAL_TRIGGER_NODE_TYPE, MANUAL_CHAT_TRIGGER_LANGCHAIN_NODE_TYPE])(
		'classifies %s as providing the n8n identity only',
		(type) => {
			expect(classifyTriggerIdentity(type, {})).toEqual({
				providesN8nIdentity: true,
				providesExternalIdentity: false,
			});
		},
	);

	it('classifies a sub-workflow trigger as providing both identities', () => {
		expect(classifyTriggerIdentity(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, {})).toEqual({
			providesN8nIdentity: true,
			providesExternalIdentity: true,
		});
	});

	describe('Chat Trigger', () => {
		it('provides both identities when availableInChat is true', () => {
			expect(classifyTriggerIdentity(CHAT_TRIGGER_NODE_TYPE, { availableInChat: true })).toEqual({
				providesN8nIdentity: true,
				providesExternalIdentity: true,
			});
		});

		// Only Chat Hub injects an identity at runtime; the canvas chat test and the
		// public chat URL establish none, so publish must reject these configs (IAM-1238).
		it.each([{}, { availableInChat: false }])(
			'provides no identity when not available in Chat Hub (%o)',
			(parameters) => {
				expect(classifyTriggerIdentity(CHAT_TRIGGER_NODE_TYPE, parameters)).toEqual({
					providesN8nIdentity: false,
					providesExternalIdentity: false,
				});
			},
		);

		// A chat trigger establishes no identity at runtime through `none`/`basicAuth`.
		it.each(['none', 'basicAuth'])(
			'provides no identity for authentication %s',
			(authentication) => {
				expect(classifyTriggerIdentity(CHAT_TRIGGER_NODE_TYPE, { authentication })).toEqual({
					providesN8nIdentity: false,
					providesExternalIdentity: false,
				});
			},
		);

		// Only the hosted-chat page runs the OAuth2 handshake that establishes the
		// visitor's identity — `mode` absent or explicit defaults to hosted. Requires the
		// chat-trigger OAuth2 flag: with it off, `n8nUserAuth` falls back to a plain cookie
		// check that never binds the visitor's identity for credential resolution.
		it.each([{}, { mode: 'hostedChat' }])(
			'provides both identities for public n8nUserAuth in hosted-chat mode when chat OAuth2 is enabled (%o)',
			(modeParams) => {
				expect(
					classifyTriggerIdentity(
						CHAT_TRIGGER_NODE_TYPE,
						{
							public: true,
							authentication: 'n8nUserAuth',
							...modeParams,
						},
						{ isChatOAuth2Enabled: true },
					),
				).toEqual({ providesN8nIdentity: true, providesExternalIdentity: true });
			},
		);

		// With the flag off (the default), the cookie fallback authenticates the request but
		// never binds the visitor's identity — publish must not advertise identity it can't
		// actually establish.
		it.each([{}, { isChatOAuth2Enabled: false }])(
			'provides no identity for public n8nUserAuth in hosted-chat mode when chat OAuth2 is disabled (%o)',
			(options) => {
				expect(
					classifyTriggerIdentity(
						CHAT_TRIGGER_NODE_TYPE,
						{ public: true, authentication: 'n8nUserAuth' },
						options,
					),
				).toEqual({ providesN8nIdentity: false, providesExternalIdentity: false });
			},
		);

		// Embedded/webhook-mode chat has no hosted page to run the OAuth2 handshake on, so
		// `n8nUserAuth` establishes no identity there despite being selected (IAM-1262/IAM-1272),
		// regardless of the chat OAuth2 flag.
		it.each([{}, { isChatOAuth2Enabled: true }])(
			'provides no identity for n8nUserAuth in webhook mode (%o)',
			(options) => {
				expect(
					classifyTriggerIdentity(
						CHAT_TRIGGER_NODE_TYPE,
						{
							public: true,
							authentication: 'n8nUserAuth',
							mode: 'webhook',
						},
						options,
					),
				).toEqual({ providesN8nIdentity: false, providesExternalIdentity: false });
			},
		);

		// A non-public trigger 404s on every production request and skips auth entirely in
		// test mode (`ChatTrigger.node.ts`'s `webhook()`), so it never reaches the code that
		// establishes identity — regardless of authentication/mode.
		it.each([{}, { public: false }])(
			'provides no identity for n8nUserAuth in hosted-chat mode when not public (%o)',
			(publicParams) => {
				expect(
					classifyTriggerIdentity(CHAT_TRIGGER_NODE_TYPE, {
						authentication: 'n8nUserAuth',
						...publicParams,
					}),
				).toEqual({ providesN8nIdentity: false, providesExternalIdentity: false });
			},
		);
	});

	describe('MCP Trigger', () => {
		it('provides both identities when authentication is n8nOAuth2', () => {
			expect(
				classifyTriggerIdentity(MCP_TRIGGER_NODE_TYPE, { authentication: 'n8nOAuth2' }),
			).toEqual({ providesN8nIdentity: true, providesExternalIdentity: true });
		});

		// The node only establishes an identity on the n8nOAuth2 branch; every other
		// auth mode runs identity-less and must not pass publish (IAM-1238).
		it.each(['bearerAuth', 'headerAuth', 'none'])(
			'provides no identity for authentication %s',
			(authentication) => {
				expect(classifyTriggerIdentity(MCP_TRIGGER_NODE_TYPE, { authentication })).toEqual({
					providesN8nIdentity: false,
					providesExternalIdentity: false,
				});
			},
		);
	});

	describe('Form Trigger', () => {
		it('provides both identities when n8nUserAuth is used', () => {
			// `n8nUserAuth` always runs the OAuth2 flow, which establishes the submitter's
			// identity.
			expect(
				classifyTriggerIdentity(FORM_TRIGGER_NODE_TYPE, { authentication: 'n8nUserAuth' }),
			).toEqual({ providesN8nIdentity: true, providesExternalIdentity: true });
		});

		it.each(['none', 'basicAuth'])(
			'provides no identity for authentication %s',
			(authentication) => {
				expect(classifyTriggerIdentity(FORM_TRIGGER_NODE_TYPE, { authentication })).toEqual({
					providesN8nIdentity: false,
					providesExternalIdentity: false,
				});
			},
		);

		it('provides the external identity when an extractor hook is configured without n8nUserAuth', () => {
			expect(
				classifyTriggerIdentity(FORM_TRIGGER_NODE_TYPE, {
					authentication: 'none',
					...hooksParameters,
				}),
			).toEqual({ providesN8nIdentity: false, providesExternalIdentity: true });
		});
	});

	describe('Webhook node', () => {
		it('provides both identities when authentication is n8nOAuth2', () => {
			expect(
				classifyTriggerIdentity('n8n-nodes-base.webhook', { authentication: 'n8nOAuth2' }),
			).toEqual({ providesN8nIdentity: true, providesExternalIdentity: true });
		});

		it('provides no identity for other authentication modes', () => {
			expect(classifyTriggerIdentity('n8n-nodes-base.webhook', { authentication: 'none' })).toEqual(
				{ providesN8nIdentity: false, providesExternalIdentity: false },
			);
		});
	});

	describe('other triggers', () => {
		it('provides the external identity only when a context establishment hook is configured', () => {
			expect(classifyTriggerIdentity('n8n-nodes-base.webhook', hooksParameters)).toEqual({
				providesN8nIdentity: false,
				providesExternalIdentity: true,
			});
		});

		it('provides the external identity when the version field was stripped on save', () => {
			// `executionsHooksVersion` is a hidden default and is not serialized into
			// saved workflows, so the hooks must still be recognized without it.
			const { executionsHooksVersion, ...withoutVersion } = hooksParameters;
			expect(classifyTriggerIdentity('n8n-nodes-base.webhook', withoutVersion)).toEqual({
				providesN8nIdentity: false,
				providesExternalIdentity: true,
			});
		});

		it('provides no identity without hooks', () => {
			expect(classifyTriggerIdentity('n8n-nodes-base.scheduleTrigger', {})).toEqual({
				providesN8nIdentity: false,
				providesExternalIdentity: false,
			});
		});

		it('provides no identity when parameters are undefined', () => {
			expect(classifyTriggerIdentity('n8n-nodes-base.webhook', undefined)).toEqual({
				providesN8nIdentity: false,
				providesExternalIdentity: false,
			});
		});

		it.each([CHAT_TRIGGER_NODE_TYPE, MCP_TRIGGER_NODE_TYPE])(
			'provides the external identity for %s with a context establishment hook',
			(type) => {
				expect(classifyTriggerIdentity(type, hooksParameters)).toEqual({
					providesN8nIdentity: false,
					providesExternalIdentity: true,
				});
			},
		);
	});
});
