import {
	INodeTypeBaseDescription,
	INodeVersions,
} from 'n8n-workflow';

import { HttpRequestV1 } from './HttpRequest_v1.node';
import { HttpRequestV2 } from './HttpRequest_v2.node';
import { NodeVersionedType } from '../../src/NodeVersionedType';

export class HttpRequest extends NodeVersionedType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'HTTP Request V1',
			name: 'httpRequest',
			icon: 'fa:at',
			group: ['input'],
			subtitle: '={{$parameter["requestMethod"] + ": " + $parameter["url"]}}',
			description: 'Makes a HTTP request and returns the received data',
			defaultVersion: 2,
		};

		const nodeVersions: INodeVersions = {
			1: new HttpRequestV1(baseDescription),
			2: new HttpRequestV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
