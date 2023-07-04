import type { INodeProperties } from 'n8n-workflow';

import { getAllowedPaths } from './utilities';

export const oldVersionNotice: INodeProperties = {
	displayName:
		'<strong>New node version available:</strong> get the latest version with added features from the nodes panel.',
	name: 'oldVersionNotice',
	type: 'notice',
	default: '',
};

export const allowedPathsNotice: INodeProperties = {
	displayName: `Allowed paths:<br> ${getAllowedPaths().join('<br>')}`,
	name: 'binaryPropertyName',
	type: getAllowedPaths().length ? 'notice' : 'hidden',
	default: 'data',
};
