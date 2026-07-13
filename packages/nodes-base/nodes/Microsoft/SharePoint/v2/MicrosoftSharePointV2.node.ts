import type { INodeType, INodeTypeBaseDescription, INodeTypeDescription } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

// Blank shell for the Graph-based v2 rebuild; credentials, actions, and
// pickers arrive in follow-up tickets. Not registered yet — uncomment the
// registration in MicrosoftSharePoint.node.ts to test locally.
export const versionDescription: INodeTypeDescription = {
	displayName: 'Microsoft SharePoint',
	name: 'microsoftSharePoint',
	icon: {
		light: 'file:microsoftSharePoint.svg',
		dark: 'file:microsoftSharePoint.svg',
	},
	group: ['transform'],
	version: 2,
	description: 'Interact with Microsoft SharePoint API',
	defaults: {
		name: 'Microsoft SharePoint',
	},
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	properties: [],
};

export class MicrosoftSharePointV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}
}
