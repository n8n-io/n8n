/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { NocoDBV1 } from './v1/NocoDBV1.node';
import { NocoDBV2 } from './v2/NocoDBV2.node';

export class NocoDB extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'NocoDB',
			name: 'nocoDb',
			icon: 'file:nocodb.svg',
			group: ['input'],
			defaultVersion: 4,
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Read, update, write and delete data from NocoDB',
			usableAsTool: true,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new NocoDBV1(baseDescription),
			2: new NocoDBV1(baseDescription),
			3: new NocoDBV1(baseDescription),
			4: new NocoDBV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
