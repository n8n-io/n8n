import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { NocoDbHttpRequestV1 } from './V1/NocoDbHttpRequestV1.node';
import { NocoDbHttpRequestV2 } from './V2/NocoDbHttpRequestV2.node';
import { NocoDbHttpRequestV3 } from './V3/NocoDbHttpRequestV3.node';

export class NocoDbHttpRequest extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'NocoDB HTTP Request',
			name: 'nocoDbHttpRequest',
			icon: 'fa:at',
			group: ['output'],
			subtitle: '={{$parameter["requestMethod"] + ": " + $parameter["route"]}}',
			description: 'Makes an HTTP request to NocoDB and returns the response data',
			defaultVersion: 4,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new NocoDbHttpRequestV1(baseDescription),
			2: new NocoDbHttpRequestV2(baseDescription),
			3: new NocoDbHttpRequestV3(baseDescription),
			4: new NocoDbHttpRequestV3(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
