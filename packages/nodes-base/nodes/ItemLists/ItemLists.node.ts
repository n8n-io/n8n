import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { ItemListsV1 } from './V1/ItemListsV1.node';

import { ItemListsV2 } from './V2/ItemListsV2.node';

export class ItemLists extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Item Lists',
			name: 'itemLists',
			icon: 'file:itemLists.svg',
			group: ['input'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Helper for working with lists of items and transforming arrays',
			defaultVersion: 2.1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new ItemListsV1(baseDescription),
			2: new ItemListsV2(baseDescription),
			2.1: new ItemListsV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
