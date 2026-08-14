import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getTeamsCredentialType, SERVICE_PRINCIPAL_AUTH } from '../../transport';

/**
 * Throws a static `NodeOperationError` when the node is configured with the
 * app-only (Service Principal) credential. Chat messages have no usable app-only
 * form (app-only Graph has no signed-in user), so every chatMessage operation
 * guards on this BEFORE any request — covering hand-edited workflows that bypass
 * the hidden UI. For `sendAndWait` it fires before any `putExecutionToWait`.
 */
export function throwIfChatUnsupported(this: IExecuteFunctions): void {
	if (getTeamsCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH) {
		throw new NodeOperationError(
			this.getNode(),
			'Chat messages are not available with the Service Principal credential',
			{
				description:
					'App-only Microsoft Graph has no signed-in user. Use an OAuth2 credential for chat actions.',
			},
		);
	}
}
