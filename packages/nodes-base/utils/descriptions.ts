import type { INodeProperties } from 'n8n-workflow';

export const oldVersionNotice: INodeProperties = {
	displayName:
		'<strong>New node version available:</strong> get the latest version with added features from the nodes panel.',
	name: 'oldVersionNotice',
	type: 'notice',
	default: '',
};
