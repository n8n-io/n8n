import {
	INodeTypeBaseDescription,
	INodeVersionedType,
} from 'n8n-workflow';

import {
	TrelloV1,
} from './v1/TrelloV1.node';

import {
	TrelloV2,
} from './v2/TrelloV2.node';

import {
	NodeVersionedType,
} from '../../src/NodeVersionedType';

export class Trello extends NodeVersionedType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Trello',
			name: 'trello',
			icon: 'file:trello.svg',
			group: ['transform'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Create, change and delete boards and cards',
			defaultVersion: 2,
		};

		const nodeVersions: INodeVersionedType['nodeVersions'] = {
			1: new TrelloV1(baseDescription),
			2: new TrelloV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
