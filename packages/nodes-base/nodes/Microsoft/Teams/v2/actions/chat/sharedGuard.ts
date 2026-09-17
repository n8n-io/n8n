import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getTeamsCredentialType, SERVICE_PRINCIPAL_AUTH } from '../../transport';

/**
 * Throws a static `NodeOperationError` when the node is configured with the
 * app-only (Service Principal) credential. `GET /chats` and `POST /chats` are
 * delegated-only (app-only must go through `GET /users/{id}/chats` and has no
 * signed-in user to add to a new chat), so every chat operation guards on this
 * BEFORE any request - covering hand-edited workflows that bypass the hidden UI.
 */
export function throwIfChatUnsupported(this: IExecuteFunctions): void {
	if (getTeamsCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH) {
		throw new NodeOperationError(
			this.getNode(),
			'Chats are not available with the Service Principal credential',
			{
				description:
					'App-only Microsoft Graph has no signed-in user to read or create chats for. Use an OAuth2 credential for chat actions.',
			},
		);
	}
}
