import {
	INodeVersions,
} from 'n8n-workflow';
import { NodeVersionedType } from '../../src/NodeVersionedType';

import { HttpRequestBase } from './HttpRequest_base.node';
import { HttpRequestV1 } from './HttpRequest_v1.node';
import { HttpRequestV2 } from './HttpRequest_v2.node';

export * from './HttpRequest_v1.node';
export * from './HttpRequest_v2.node';

export class HttpRequest extends NodeVersionedType {
	constructor() {
		const nodeVersions: INodeVersions = {
			1: new HttpRequestV1(),
			2: new HttpRequestV2(),
		},
		defaultVersion = 2;
		super(nodeVersions, (new HttpRequestBase()).description, defaultVersion);
	}
}
