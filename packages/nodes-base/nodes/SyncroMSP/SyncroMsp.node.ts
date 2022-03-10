import { INodeTypeBaseDescription, INodeVersionedType } from 'n8n-workflow';

import { NodeVersionedType } from '../../src/NodeVersionedType';

import { SyncroMspV1 } from './v1/SyncroMspV1.node';
const isOnline = require('is-online');
export class SyncroMsp extends NodeVersionedType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'SyncroMSP',
			name: 'syncroMsp',
			icon: 'file:syncromsp.png',
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Manage contacts, tickets and more from Syncro MSP',
			defaultVersion: 1,
		};

		const nodeVersions: INodeVersionedType['nodeVersions'] = {
			1: new SyncroMspV1(baseDescription),
		};
		isOnline().then(async (online: boolean) => {
			if (online) {
				try {
					super(nodeVersions, baseDescription);
				} catch (error) {
					if (error.response) {
						console.log(`Error : ${error.response}`);
					}
				}
			} else {
				console.log('we have a network problem');
			}
		});
	}
}
