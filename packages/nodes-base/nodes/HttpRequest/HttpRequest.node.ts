import {
	INodeType,
	INodeVersionedType,
} from 'n8n-workflow';
import {HttpRequestV1} from './HttpRequest_v1.node';
import {HttpRequestV2} from './HttpRequest_v2.node';


interface OptionData {
	name: string;
	displayName: string;
}

interface OptionDataParamters {
	[key: string]: OptionData;
}

export * from './HttpRequest_v1.node';
export * from './HttpRequest_v2.node';

export class HttpRequest implements INodeVersionedType {

	defaultVersion = 2;
	nodeVersions: {[key: number]: INodeType};
	
	constructor() {
		this.nodeVersions = {
			1: new HttpRequestV1(),
			2: new HttpRequestV2(),
		};
	}

	getNodeType(version?: number): INodeType {
		if(version) {
			return this.nodeVersions[version];
		} else {
			return this.nodeVersions[this.defaultVersion];
		}
	}
}
