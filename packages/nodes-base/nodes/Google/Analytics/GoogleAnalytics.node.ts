import { INodeTypeBaseDescription, INodeVersionedType } from 'n8n-workflow';
import { NodeVersionedType } from '../../../src/NodeVersionedType';
import { GoogleAnalyticsV1 } from './v1/GoogleAnalyticsV1.node';
import { GoogleAnalyticsV2 } from './v2/GoogleAnalyticsV2.node';

export class GoogleAnalytics extends NodeVersionedType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Google Analytics',
			name: 'googleAnalytics',
			icon: 'file:analytics.svg',
			group: ['transform'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Use the Google Analytics API',
			defaultVersion: 2,
		};

		const nodeVersions: INodeVersionedType['nodeVersions'] = {
			1: new GoogleAnalyticsV1(baseDescription),
			2: new GoogleAnalyticsV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
