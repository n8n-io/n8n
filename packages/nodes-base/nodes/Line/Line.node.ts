import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { LineV1 } from './V1/LineV1.node';
import { LineV2 } from './V2/LineV2.node';

export class Line extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Line',
			name: 'line',
			// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
			icon: 'file:line.png',
			group: ['input'],
			subtitle: '={{$parameter["operation"]}}',
			description: 'Consume Line API',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new LineV1(baseDescription),
			2: new LineV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
