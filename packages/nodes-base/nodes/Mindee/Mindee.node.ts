import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { MindeeV1 } from './v1/MindeeV1.node';
import { MindeeV2 } from './v2/MindeeV2.node';

export class Mindee extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Mindee',
			name: 'mindee',
			icon: 'file:mindee.svg',
			group: ['input'],
			description: 'Consume Mindee API',
			defaultVersion: 4,
		};

		// Versions 1-3 target the legacy Mindee API, which only supports existing
		// products. Version 4 targets the Mindee V2 API.
		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			/* eslint-disable @typescript-eslint/naming-convention */
			1: new MindeeV1(baseDescription),
			2: new MindeeV1(baseDescription),
			3: new MindeeV1(baseDescription),
			4: new MindeeV2(baseDescription),
			/* eslint-enable @typescript-eslint/naming-convention */
		};

		super(nodeVersions, baseDescription);
	}
}
