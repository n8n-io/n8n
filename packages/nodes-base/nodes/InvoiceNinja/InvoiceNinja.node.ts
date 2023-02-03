import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { InvoiceNinja as InvoiceNinjaV1u2 } from './V1u2/InvoiceNinja.node';
import { InvoiceNinja as InvoiceNinjaV3 } from './V3/InvoiceNinja.node';

export class InvoiceNinja extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Invoice Ninja',
			name: 'invoiceNinja',
			icon: 'file:invoiceNinja.svg',
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Invoice Ninja API',
			defaultVersion: 3,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new InvoiceNinjaV1u2(baseDescription),
			2: new InvoiceNinjaV1u2(baseDescription),
			3: new InvoiceNinjaV3(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
