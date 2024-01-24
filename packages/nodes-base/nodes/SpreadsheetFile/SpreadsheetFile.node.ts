import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { SpreadsheetFileV1 } from './v1/SpreadsheetFileV1.node';
import { SpreadsheetFileV2 } from './v2/SpreadsheetFileV2.node';

export class SpreadsheetFile extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			hidden: true,
			displayName: 'Spreadsheet File',
			name: 'spreadsheetFile',
			icon: 'fa:table',
			group: ['transform'],
			description: 'Reads and writes data from a spreadsheet file like CSV, XLS, ODS, etc',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SpreadsheetFileV1(baseDescription),
			2: new SpreadsheetFileV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
