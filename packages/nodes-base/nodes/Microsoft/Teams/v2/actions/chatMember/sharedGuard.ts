import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getTeamsCredentialType, SERVICE_PRINCIPAL_AUTH } from '../../transport';

/**
 * Throws a static `NodeOperationError` when the node is configured with the
 * app-only (Service Principal) credential. Chat membership has no usable app-only
 * form (app-only Graph has no signed-in user), so every chatMember operation guards
 * on this BEFORE any request — covering hand-edited workflows that bypass the
 * hidden UI. Takes the item index so the error points at the failing item inside
 * the router's per-item `continueOnFail` loop.
 */
export function throwIfChatMemberUnsupported(this: IExecuteFunctions, i: number): void {
	if (getTeamsCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH) {
		throw new NodeOperationError(
			this.getNode(),
			'Chat members are not available with the Service Principal credential',
			{
				description:
					'App-only Microsoft Graph has no signed-in user. Use an OAuth2 credential for chat actions.',
				itemIndex: i,
			},
		);
	}
}
