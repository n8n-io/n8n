import type { INodeProperties } from 'n8n-workflow';

/**
 * App-only target selector for the Service Principal credential. App-only Microsoft
 * Graph has no `/me`, so the user must say which user or drive holds the workbooks the
 * node should act on. These are STATIC `INodeProperties` only — the runtime resolution
 * lives in `resolveScopeRoot` in `transport/index.ts`.
 *
 * Each property is shown (and required) only when the Service Principal credential
 * is selected. The RLCs use ID mode only (no `searchListMethod`) so rendering needs
 * no Directory.Read.All — the user pastes the id. The param `name`s are kept identical
 * to the Microsoft OneDrive node's so the transport can read `${target}Target`
 * generically and so workflow JSON stays portable across the nodes.
 *
 * SharePoint site/library app-only access is intentionally NOT a target here — a
 * document library is reachable via its drive ID (the Drive target), and full Site
 * addressing lands with the Microsoft SharePoint node (ENT-92), matching the OneDrive
 * reference which dropped its Site target for the same reason.
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
	description: 'The user whose drive the Service Principal should act on',
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
	description: 'The drive the Service Principal should act on',
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
