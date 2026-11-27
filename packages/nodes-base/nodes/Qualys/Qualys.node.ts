import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { properties } from './actions/description';
import { router } from './actions/router';
import { authenticationProperties, qualysCredentials } from './transport/authentication';

export class Qualys implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Qualys',
		name: 'qualys',
		group: ['transform'],
		icon: { light: 'file:qualys.svg', dark: 'file:qualys.dark.svg' },
		version: 1,
		subtitle: '={{ $parameter["resource"] + ": " + $parameter["operation"] }}',
		description:
			'Read asset and vulnerability data from Qualys VMDR, VMDR OT and CyberSecurity Asset Management',
		defaults: {
			name: 'Qualys',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: qualysCredentials,
		properties: [...authenticationProperties, ...properties],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await router.call(this);
	}
}
