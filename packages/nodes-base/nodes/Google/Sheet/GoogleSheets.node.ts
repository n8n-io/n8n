import {
	INodeTypeBaseDescription,
	INodeVersionedType,
} from 'n8n-workflow';

import { GoogleSheetsV1 } from './v1/GoogleSheetsV1.node';
import { GoogleSheetsV2 } from './v2/GoogleSheetsV2.node';

import {
	NodeVersionedType,
} from '../../../src/NodeVersionedType';

export class GoogleSheets extends NodeVersionedType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Google Sheets ',
			name: 'googleSheets',
			icon: 'file:googleSheets.svg',
			group: ['input', 'output'],
			defaultVersion: 2,
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Read, update and write data to Google Sheets',
		};

		const nodeVersions: INodeVersionedType['nodeVersions'] = {
			1: new GoogleSheetsV1(baseDescription),
			2: new GoogleSheetsV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
