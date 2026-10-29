import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { MondayComV1 } from './V1/MondayComV1.node';
import { MondayComV2 } from './V2/MondayComV2.node';

export class MondayCom extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Monday.com',
			name: 'mondayCom',
			icon: 'file:mondayCom.svg',
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Monday.com API',
			// V2 reaches V1 parity (board/group/column/item/update). Existing
			// workflows stay on typeVersion 1 until the user upgrades them.
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new MondayComV1(baseDescription),
			2: new MondayComV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
