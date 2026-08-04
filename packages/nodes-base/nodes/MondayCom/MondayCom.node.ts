import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { MondayComV1 } from './V1/MondayComV1.node';
// import { MondayComV2 } from './V2/MondayComV2.node';

export class MondayCom extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Monday.com',
			name: 'mondayCom',
			icon: 'file:mondayCom.svg',
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Monday.com API',
			// V2 (the ported official community implementation) becomes the
			// default only when it reaches full V1 parity, in the final PR of
			// this series.
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new MondayComV1(baseDescription),
			// V2 is under construction. The editor and AI builder surface the
			// highest registered version regardless of defaultVersion, so v2 must
			// stay unregistered until the final PR of this series flips the
			// default. Uncomment locally to test v2 work.
			// 2: new MondayComV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
