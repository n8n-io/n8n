import {
	INodeTypeBaseDescription,
	INodeVersionedType,
} from 'n8n-workflow';

import { NodeVersionedType } from '../../src/NodeVersionedType';
import { HttpRequestV1 } from './v1/HttpRequestV1.node';
import { HttpRequestV2 } from './v2/HttpRequestV2.node';

export class HttpRequest extends NodeVersionedType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'HTTP Request',
			name: 'httpRequest',
			icon: 'fa:at',
			group: ['input'],
			subtitle: '={{$parameter["requestMethod"] + ": " + $parameter["url"]}}',
			description: 'Makes an HTTP request and returns the response data',
			defaultVersion: 2,
		};

		const nodeVersions: INodeVersionedType['nodeVersions'] = {
			1: new HttpRequestV1(baseDescription),
			2: new HttpRequestV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
