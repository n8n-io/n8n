import {
	CHAT_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPES,
	MCP_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
} from './constants';
import { toExecutionContextEstablishmentHookParameter } from './execution-context-establishment-hooks';
import type { INodeParameters } from './interfaces';

/**
 * The identity families a trigger can establish at runtime, used to gate dynamic
 * (resolvable) credentials:
 * - `providesN8nIdentity`: the n8n user identity, keyed on by the system resolver
 *   (private credentials).
 * - `providesExternalIdentity`: an identity extracted from the trigger data, keyed
 *   on by custom resolvers (OAuth, Slack, …).
 */
export interface TriggerIdentityCapabilities {
	providesN8nIdentity: boolean;
	providesExternalIdentity: boolean;
}

const NO_IDENTITY: TriggerIdentityCapabilities = {
	providesN8nIdentity: false,
	providesExternalIdentity: false,
};

/** Instance-level toggles that change what a trigger can establish. */
export interface TriggerIdentityOptions {
	/**
	 * Whether `N8N_ENV_FEAT_FORM_TRIGGER_OAUTH2` is on for the instance — not a
	 * per-node setting. The flag doesn't gate the form's `n8nUserAuth` option
	 * (that's `typeVersion >= 2.6`); it selects which flow backs it. On ⇒ OAuth2,
	 * establishing the submitter's identity. Off ⇒ the legacy cookie/HMAC flow,
	 * which authenticates the submitter but establishes no identity.
	 */
	isFormOAuth2Enabled?: boolean;
}

/** Whether a trigger's parameters declare at least one context establishment hook. */
function hasContextEstablishmentHook(parameters: INodeParameters | undefined): boolean {
	const hookParams = toExecutionContextEstablishmentHookParameter(parameters);
	return (
		hookParams !== null &&
		hookParams.success &&
		hookParams.data.contextEstablishmentHooks.hooks.length > 0
	);
}

/**
 * Classifies a single trigger node by the identity it can establish at runtime.
 *
 * Shared by the backend publish-time validation (`WorkflowValidationService`) and
 * the editor's trigger-compatibility warning so the two can't drift. Keep it in
 * sync with how the engine establishes identity (`execution-context.ts`,
 * manual/parent inheritance) and the resolvers' identifiers (e.g. `N8NIdentifier`):
 * when a new trigger or identity source is added there, reflect it here too.
 */
export function classifyTriggerIdentity(
	nodeType: string,
	parameters: INodeParameters | undefined,
	options: TriggerIdentityOptions = {},
): TriggerIdentityCapabilities {
	// Sub-workflows inherit identity from the parent; Chat Hub and MCP-over-n8nOAuth2
	// inject it. All provide both identity families.
	const isSubWorkflowTrigger = nodeType === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE;
	const isChatHubTrigger =
		nodeType === CHAT_TRIGGER_NODE_TYPE && parameters?.availableInChat === true;
	const isMcpTrigger =
		nodeType === MCP_TRIGGER_NODE_TYPE && parameters?.authentication === 'n8nOAuth2';
	// The Webhook node's opt-in "n8n User Auth (OAuth2)" mode injects the caller's
	// n8n identity the same way the MCP trigger does — sharing the `n8nOAuth2` value.
	const isOAuth2Webhook =
		nodeType === WEBHOOK_NODE_TYPE && parameters?.authentication === 'n8nOAuth2';
	// The form trigger only establishes an identity through its OAuth2 flow, so callers
	// must opt the branch in with the instance's `isFormOAuth2Enabled`. Omitting it fails
	// closed: without the flag a `n8nUserAuth` form takes the legacy cookie/HMAC path,
	// which authenticates the submitter but establishes no identity to resolve
	// credentials with — publish must reject that instead of failing mid-execution.
	const isFormTrigger =
		nodeType === FORM_TRIGGER_NODE_TYPE &&
		parameters?.authentication === 'n8nUserAuth' &&
		options.isFormOAuth2Enabled === true;
	if (
		isSubWorkflowTrigger ||
		isChatHubTrigger ||
		isMcpTrigger ||
		isFormTrigger ||
		isOAuth2Webhook
	) {
		return { providesN8nIdentity: true, providesExternalIdentity: true };
	}

	// Manual/chat/MCP triggers run with the n8n user identity.
	if (MANUAL_TRIGGER_NODE_TYPES.includes(nodeType)) {
		return { providesN8nIdentity: true, providesExternalIdentity: false };
	}

	// Any other trigger with a context establishment hook provides an external identity.
	if (hasContextEstablishmentHook(parameters)) {
		return { providesN8nIdentity: false, providesExternalIdentity: true };
	}

	return NO_IDENTITY;
}
