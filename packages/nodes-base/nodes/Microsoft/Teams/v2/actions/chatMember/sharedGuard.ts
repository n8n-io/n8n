import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getTeamsCredentialType, SERVICE_PRINCIPAL_AUTH } from '../../transport';

/**
 * Throws a static `NodeOperationError` when the node is configured with the
 * app-only (Service Principal) credential. The endpoints themselves have
 * application permissions, but the chat picker does not: `GET /chats` is
 * delegated-only (app-only must go through `GET /users/{id}/chats`), so every
 * chatMember operation guards on this BEFORE any request - covering
 * hand-edited workflows that bypass the hidden UI.
 */
export function throwIfChatMemberUnsupported(this: IExecuteFunctions): void {
	if (getTeamsCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH) {
		throw new NodeOperationError(
			this.getNode(),
			'Chat members are not available with the Service Principal credential',
			{
				description:
					'The chat picker cannot list chats app-only. Use an OAuth2 credential for chat actions.',
			},
		);
	}
}
