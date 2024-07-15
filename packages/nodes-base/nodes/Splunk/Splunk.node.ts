import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { SplunkV1 } from './v1/SplunkV1.node';
import { SplunkV2 } from './v2/SplunkV2.node';

export class Splunk extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Splunk',
			name: 'splunk',
			icon: 'file:splunk.svg',
			group: ['transform'],
			description: 'Consume the Splunk Enterprise API',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SplunkV1(baseDescription),
			2: new SplunkV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
