import type { INodeProperties } from 'n8n-workflow';

/**
 * App-only target selector. Service Principal (app-only) Microsoft Graph has no
 * `/me`, so the user must say which user or drive the node should act on. These are
 * STATIC `INodeProperties` only — the runtime resolution lives in
 * `resolveDriveScopeRoot` in `GenericFunctions.ts`. Defined once here and spread
 * into both the node and the trigger so the two stay in lockstep.
 *
 * Each property is shown (and required) only when the Service Principal credential
 * is selected. The RLCs use ID mode only (no `searchListMethod`) so rendering needs
 * no Directory.Read.All — the user pastes the id. (SharePoint site/library app-only
 * access lives in the Microsoft SharePoint node.)
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
			description: "Act on a user's OneDrive (by UPN or user ID)",
		},
		{
			name: 'Drive',
			value: 'drive',
			description: 'Act on a specific drive (by drive ID)',
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
	// Shared with the trigger: the action node evaluates this per input item; the
	// trigger resolves it once per poll.
	modes: [
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. jane@contoso.com or a user object ID',
			hint: 'The user principal name (UPN) or object ID of the user whose OneDrive to use',
		},
	],
	description:
		'The user whose OneDrive the Service Principal should act on. Evaluated per input item, so an expression can target a different user for each item.',
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
	// Shared with the trigger: the action node evaluates this per input item; the
	// trigger resolves it once per poll.
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
		'The drive the Service Principal should act on. Evaluated per input item, so an expression can target a different drive for each item.',
	displayOptions: {
		show: {
			authentication: ['microsoftEntraServicePrincipalApi'],
			resourceTarget: ['drive'],
		},
	},
};

/** The full set of app-only target params, spread into the action node. */
export const targetDescription: INodeProperties[] = [
	resourceTargetParam,
	userTargetRLC,
	driveTargetRLC,
];

/**
 * Trigger variant: same params, poll-appropriate copy — a poll has no input items,
 * so the per-item wording of the action node would be wrong there.
 */
export const triggerTargetDescription: INodeProperties[] = [
	resourceTargetParam,
	{
		...userTargetRLC,
		description:
			'The user whose OneDrive the Service Principal should act on. Resolved once per poll.',
	},
	{
		...driveTargetRLC,
		description: 'The drive the Service Principal should act on. Resolved once per poll.',
	},
];
