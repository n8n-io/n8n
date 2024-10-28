import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { SwitchV1 } from './V1/SwitchV1.node';
import { SwitchV2 } from './V2/SwitchV2.node';
import { SwitchV3 } from './V3/SwitchV3.node';

export class Switch extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Switch',
			name: 'switch',
			icon: 'fa:map-signs',
			iconColor: 'light-blue',
			group: ['transform'],
			description: 'Route items depending on defined expression or rules',
			defaultVersion: 3,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SwitchV1(baseDescription),
			2: new SwitchV2(baseDescription),
			3: new SwitchV3(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
