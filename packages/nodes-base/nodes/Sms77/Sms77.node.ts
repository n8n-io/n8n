import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { Sms77V1 } from './v1/Sms77V1.node';
import { Sms77V2 } from './v2/Sms77V2.node';

// internal node name stays 'sms77' to keep existing workflows and credentials working
export class Sms77 extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'seven',
			name: 'sms77',
			icon: 'file:seven.svg',
			group: ['transform'],
			defaultVersion: 2,
			description: 'Send SMS, RCS, WhatsApp, voice messages and manage seven resources',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new Sms77V1(baseDescription),
			2: new Sms77V2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
