import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { getTeamsCredentialType, SERVICE_PRINCIPAL_AUTH } from '../../transport';

/**
 * Throws a static `NodeOperationError` when the node is configured with the
 * app-only (Service Principal) credential. Every online-meeting operation runs
 * on the signed-in user's `/me` path, which does not exist app-only, so each
 * operation guards on this BEFORE any request — covering hand-edited workflows
 * that bypass the hidden UI.
 */
export function throwIfOnlineMeetingUnsupported(this: IExecuteFunctions): void {
	if (getTeamsCredentialType.call(this) === SERVICE_PRINCIPAL_AUTH) {
		throw new NodeOperationError(
			this.getNode(),
			'Online meetings are not available with the Service Principal credential',
			{
				description:
					'Online meeting operations run on the signed-in user (/me). Use an OAuth2 credential instead.',
			},
		);
	}
}
