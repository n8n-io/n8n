import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { KeboolaV1 } from './V1/KeboolaV1.node';

export class Keboola extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Keboola',
			name: 'keboola',
			icon: 'file:keboola.svg',
			group: ['input'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Interact wih Keboola Storage API',
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new KeboolaV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
