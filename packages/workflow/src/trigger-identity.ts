import {
	CHAT_TRIGGER_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPES,
	MCP_TRIGGER_NODE_TYPE,
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
): TriggerIdentityCapabilities {
	// Sub-workflows inherit identity from the parent; Chat Hub and MCP-over-n8nOAuth2
	// inject it. All provide both identity families.
	const isSubWorkflowTrigger = nodeType === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE;
	const isChatHubTrigger =
		nodeType === CHAT_TRIGGER_NODE_TYPE && parameters?.availableInChat === true;
	const isMcpTrigger =
		nodeType === MCP_TRIGGER_NODE_TYPE && parameters?.authentication === 'n8nOAuth2';
	if (isSubWorkflowTrigger || isChatHubTrigger || isMcpTrigger) {
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
