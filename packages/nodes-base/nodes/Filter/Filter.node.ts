import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { FilterV1 } from './V1/FilterV1.node';
import { FilterV2 } from './V2/FilterV2.node';

export class Filter extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Filter',
			name: 'filter',
			icon: 'fa:filter',
			iconColor: 'light-blue',
			group: ['transform'],
			description: 'Remove items matching a condition',
			defaultVersion: 2.2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new FilterV1(baseDescription),
			2: new FilterV2(baseDescription),
			2.1: new FilterV2(baseDescription),
			2.2: new FilterV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
