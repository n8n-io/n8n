import type { INodeProperties } from 'n8n-workflow';

/**
 * App-only target selector (Service Principal only): which user/drive holds the workbooks.
 * Static descriptors — runtime resolution lives in `resolveScopeRoot` (transport/index.ts).
 */
export const resourceTargetParam: INodeProperties = {
	displayName: 'Access As',
	name: 'resourceTarget',
	type: 'options',
	noDataExpression: true,
	options: [
		{
			name: 'User',
			value: 'user',
			description: "Act on a user's drive (by UPN or user ID)",
		},
		{
			name: 'Drive',
			value: 'drive',
			description: 'Act on a specific drive (by drive ID, e.g. a SharePoint document library)',
		},
	],
	default: 'user',
	description: 'Which drive the Service Principal should act on (app-only has no personal drive)',
	displayOptions: {
		show: {
			authentication: ['microsoftEntraServicePrincipalApi'],
		},
	},
};

export const userTargetRLC: INodeProperties = {
	displayName: 'User',
	name: 'userTarget',
	type: 'resourceLocator',
	default: { mode: 'id', value: '' },
	required: true,
	modes: [
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. jane@contoso.com or a user object ID',
			hint: 'The user principal name (UPN) or object ID of the user whose drive holds the workbooks',
		},
	],
	description:
		"The user whose drive the Service Principal should act on. Evaluated per input item — an expression can target a different user for each item. Operations that write all rows in one request (append, update, upsert) use the first item's target.",
	displayOptions: {
		show: {
			authentication: ['microsoftEntraServicePrincipalApi'],
			resourceTarget: ['user'],
		},
	},
};

export const driveTargetRLC: INodeProperties = {
	displayName: 'Drive',
	name: 'driveTarget',
	type: 'resourceLocator',
	default: { mode: 'id', value: '' },
	required: true,
	modes: [
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. b!abc123...',
			hint: "The drive's own ID (looks like `b!…`), not a file or folder ID. Get it from `GET /users/{upn}/drive` (the `id` field).",
		},
	],
	description:
		"The drive the Service Principal should act on. Evaluated per input item — an expression can target a different drive for each item. Operations that write all rows in one request (append, update, upsert) use the first item's target.",
	displayOptions: {
		show: {
			authentication: ['microsoftEntraServicePrincipalApi'],
			resourceTarget: ['drive'],
		},
	},
};

/** The full set of app-only target params, spread into the node after the auth selector. */
export const targetDescription: INodeProperties[] = [
	resourceTargetParam,
	userTargetRLC,
	driveTargetRLC,
];
