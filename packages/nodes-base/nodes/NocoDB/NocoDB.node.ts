import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { NocoDBV2 } from './v2/NocoDBV2.node';
import { NocoDBV3 } from './v3/NocoDBV3.node';

export class NocoDB extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'NocoDB',
			name: 'nocoDb',
			icon: 'file:nocodb.svg',
			group: ['input'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Read, update, write and delete data from NocoDB',
			usableAsTool: true,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new NocoDBV2(baseDescription),
			2: new NocoDBV2(baseDescription),
			3: new NocoDBV2(baseDescription),
			4: new NocoDBV3(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
