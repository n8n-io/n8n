import {
	INodeTypeBaseDescription,
	INodeVersionedType,
} from 'n8n-workflow';

import { AdsV1 } from './v1/AdsV1.node';
import { NodeVersionedType } from '../../../src/NodeVersionedType';

export class GoogleAds extends NodeVersionedType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Google Ads',
			name: 'googleAds',
			icon: 'file:googleAds.svg',
			group: ['transform'],
			defaultVersion: 1,
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Use the Google Ads API',
		};

		const nodeVersions: INodeVersionedType['nodeVersions'] = {
			1: new AdsV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
