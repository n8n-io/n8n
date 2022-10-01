import { INodeTypeBaseDescription, INodeVersionedType } from 'n8n-workflow';

import { HttpRequestV1 } from './V1/HttpRequestV1.node';

import { HttpRequestV2 } from './V2/HttpRequestV2.node';

import { HttpRequestV3 } from './V3/HttpRequestV3.node';

import { NodeVersionedType } from '../../src/NodeVersionedType';

export class HttpRequest extends NodeVersionedType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'HTTP Request',
			name: 'httpRequest',
			icon: 'fa:at',
			group: ['output'],
			subtitle: '={{$parameter["requestMethod"] + ": " + $parameter["url"]}}',
			description: 'Makes an HTTP request and returns the response data',
			defaultVersion: 3,
		};

		const nodeVersions: INodeVersionedType['nodeVersions'] = {
			1: new HttpRequestV1(baseDescription),
			2: new HttpRequestV2(baseDescription),
			3: new HttpRequestV3(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
