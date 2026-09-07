import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getTeamsCredentialType, SERVICE_PRINCIPAL_AUTH } from '../../transport';

/**
 * Throws a static `NodeOperationError` when the node is configured with the
 * app-only (Service Principal) credential. App-only Graph exposes channel-message
 * posting only via migration import, so `create` and `reply` guard on this BEFORE
 * any request — covering hand-edited workflows that bypass the hidden UI.
 */
export function throwIfChannelMessageSendUnsupported(this: IExecuteFunctions, i: number): void {
	if (getTeamsCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH) {
		throw new NodeOperationError(
			this.getNode(),
			'Sending channel messages is not available with the Service Principal credential',
			{
				itemIndex: i,
				description:
					'App-only Microsoft Graph supports only migration import for channel messages. Use an OAuth2 credential to post messages.',
			},
		);
	}
}
