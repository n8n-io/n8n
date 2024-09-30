import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { SeafileV1 } from './v1/SeafileV1.node';

export class Seafile extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Seafile',
			name: 'seafile',
			icon: 'file:seafile.svg',
			group: ['output'],
			subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
			description: 'Interact with the Neutrino general-purpose API.',
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SeafileV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
