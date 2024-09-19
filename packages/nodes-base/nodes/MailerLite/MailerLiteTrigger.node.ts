import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { MailerLiteTriggerV1 } from './v1/MailerLiteTriggerV1.node';

export class MailerLiteTrigger extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'MailerLite Trigger',
			name: 'mailerLiteTrigger',
			icon: 'file:MailerLite.svg',
			group: ['trigger'],
			description: 'Starts the workflow when MailerLite events occur',
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new MailerLiteTriggerV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
