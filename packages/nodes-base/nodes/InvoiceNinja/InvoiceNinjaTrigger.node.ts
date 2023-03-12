import { VersionedNodeType, INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';

import { InvoiceNinjaTriggerV1u2 } from './V1u2/InvoiceNinjaTriggerV1u2.node';
import { InvoiceNinjaTriggerV3 } from './V3/InvoiceNinjaTriggerV3.node';

export class InvoiceNinjaTrigger extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Invoice Ninja Trigger',
			name: 'invoiceNinjaTrigger',
			icon: 'file:invoiceNinja.svg',
			group: ['trigger'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Consume Invoice Ninja API',
			defaultVersion: 3,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new InvoiceNinjaTriggerV1u2(baseDescription),
			2: new InvoiceNinjaTriggerV1u2(baseDescription),
			3: new InvoiceNinjaTriggerV3(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
