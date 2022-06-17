import {
	INodeTypeBaseDescription,
	INodeVersionedType,
} from 'n8n-workflow';

import { NimflowV1 } from './v1/NimflowV1.node';
import { NodeVersionedType } from '../../src/NodeVersionedType';

export class Nimflow extends NodeVersionedType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Nimflow',
			name: 'nimflow',
			icon: 'file:nimflow.svg',
			group: ['transform'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Nimflow API',
			defaultVersion: 1,
		};

		const nodeVersions: INodeVersionedType['nodeVersions'] = {
			1: new NimflowV1(baseDescription),
		};
		super(nodeVersions, baseDescription);
	}
}
