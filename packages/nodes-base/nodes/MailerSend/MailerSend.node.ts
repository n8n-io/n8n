
import { NodeVersionedType } from '../../src/NodeVersionedType';

import {
	INodeTypeBaseDescription,
	INodeVersionedType,
} from 'n8n-workflow';

import { MailerSendV1 } from './v1/MailerSendV1.node';

export class MailerSend extends NodeVersionedType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'MailerSend',
			name: 'mailerSend',
			icon: 'file:mailerSend.svg',
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume MailerSend API',
			defaultVersion: 1,
		};

		const nodeVersions: INodeVersionedType['nodeVersions'] = {
			1: new MailerSendV1(baseDescription),
		}

		super(nodeVersions, baseDescription);
	}
}
