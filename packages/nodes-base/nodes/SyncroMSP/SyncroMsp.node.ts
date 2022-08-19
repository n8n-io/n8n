import { INodeTypeBaseDescription, INodeVersionedType } from 'n8n-workflow';

import { NodeVersionedType } from '../../src/NodeVersionedType';

import { SyncroMspV1 } from './v1/SyncroMspV1.node';

export class SyncroMsp extends NodeVersionedType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'SyncroMSP',
			name: 'syncroMsp',
			// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
			icon: 'file:syncromsp.png',
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Manage contacts, tickets and more from Syncro MSP',
			defaultVersion: 1,
		};

		const nodeVersions: INodeVersionedType['nodeVersions'] = {
			1: new SyncroMspV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
