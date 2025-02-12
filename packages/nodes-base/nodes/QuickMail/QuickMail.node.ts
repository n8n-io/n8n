import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { QuickMailV1 } from './v1/QuickMailV1.node';

export class QuickMail extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Quick Email',
			name: 'quickMail',
			icon: 'fa:envelope',
			group: ['output'],
			defaultVersion: 1,
			description: 'Sends an email to a local email address',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new QuickMailV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
