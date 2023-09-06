import type { IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { SpreadsheetFileV1 } from './v1/SpreadsheetFileV1.node';
import { SpreadsheetFileV2 } from './v2/SpreadsheetFileV2.node';
import { baseDescription } from './description';

export class SpreadsheetFile extends VersionedNodeType {
	constructor() {
		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SpreadsheetFileV1(),
			2: new SpreadsheetFileV2(),
		};

		super(nodeVersions, baseDescription);
	}
}
