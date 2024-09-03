import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { LemlistV1 } from './v1/LemlistV1.node';
import { LemlistV2 } from './v2/LemlistV2.node';

export class Lemlist extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Lemlist',
			name: 'lemlist',
			icon: 'file:lemlist.svg',
			group: ['transform'],
			defaultVersion: 2,
			description: 'Consume the Lemlist API',
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new LemlistV1(baseDescription),
			2: new LemlistV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
