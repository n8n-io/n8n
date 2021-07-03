import {
	INodeTypeBaseDescription,
	INodeVersions,
} from 'n8n-workflow';

import { MattermostV1 } from './v1/MattermostV1.node';
import { NodeVersionedType } from '../../src/NodeVersionedType';

export class Mattermost extends NodeVersionedType {
	constructor() {
		const description: INodeTypeBaseDescription = {
			displayName: 'Mattermost V1',
			name: 'mattermost',
			icon: 'file:mattermost.svg',
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Sends data to Mattermost',
			defaultVersion: 1,
		},
		nodeVersions: INodeVersions = {
			1: new MattermostV1(description),
		},
		defaultVersion = description.defaultVersion;
		super(nodeVersions, description, defaultVersion);
	}
}
