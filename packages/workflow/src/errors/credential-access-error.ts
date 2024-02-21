import type { INode } from '@/Interfaces';
import { ExecutionBaseError } from './abstract/execution-base.error';

export class CredentialAccessError extends ExecutionBaseError {
	override readonly description =
		'Please recreate the credential or ask its owner to share it with you.';

	override readonly level = 'warning';

	constructor(
		readonly node: INode,
		credentialId: string,
		workflow: { id: string; name?: string },
	) {
		super('Node has no access to credential', {
			tags: {
				nodeType: node.type,
			},
			extra: {
				workflowId: workflow.id,
				workflowName: workflow.name ?? '',
				credentialId,
			},
		});
	}
}
