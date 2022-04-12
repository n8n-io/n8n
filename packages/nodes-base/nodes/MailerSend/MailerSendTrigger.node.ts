
import { NodeVersionedType } from '../../src/NodeVersionedType';

import {
	INodeTypeBaseDescription,
	INodeVersionedType,
} from 'n8n-workflow';

import { MailerSendTriggerV1 } from './v1/MailerSendTriggerV1.node';

export class MailerSendTrigger extends NodeVersionedType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'MailerSend Trigger',
			name: 'mailerSendTrigger',
			icon: 'file:mailerSend.svg',
			group: ['trigger'],
			subtitle: '={{$parameter["event"]}}',
			description: 'Handle MailerSend events via webhooks',
			defaultVersion: 1,
		};

		const nodeVersions: INodeVersionedType['nodeVersions'] = {
			1: new MailerSendTriggerV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
