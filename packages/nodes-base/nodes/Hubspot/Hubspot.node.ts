import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { HubspotV1 } from './V1/HubspotV1.node';

import { HubspotV2 } from './V2/HubspotV2.node';

export class Hubspot extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'HubSpot',
			name: 'hubspot',
			icon: 'file:hubspot.svg',
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume HubSpot API',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new HubspotV1(baseDescription),
			2: new HubspotV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
