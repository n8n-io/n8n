import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { MessageAnAgentV1 } from './v1/MessageAnAgentV1.node';
import { MessageAnAgentV2 } from './v2/MessageAnAgentV2.node';

/**
 * Identity shared by every version. The per-version descriptions add `version`,
 * the `agentId` property, and (v1 only) the `listAgents` search method.
 */
export const baseDescription: INodeTypeBaseDescription = {
	displayName: 'Message an n8n Agent',
	name: 'messageAnAgent',
	icon: 'node:ai-agent',
	group: ['transform'],
	description: 'Send a message to a n8n agent',
	defaultVersion: 2,
};

export class MessageAnAgent extends VersionedNodeType {
	constructor() {
		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			// v1 keeps the original resourceLocator picker so existing workflows
			// (typeVersion 1) are unaffected. v2 uses the agentSelector picker.
			1: new MessageAnAgentV1(baseDescription),
			2: new MessageAnAgentV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
