import type { INodeProperties } from 'n8n-workflow';

/**
 * App-only target selector for the Service Principal credential. App-only Microsoft
 * Graph has no `/me`, and To Do lists/tasks belong to a user, so the node must be told
 * which user to act on. This is a STATIC `INodeProperties` only — the runtime resolution
 * lives in `resolveScopeRoot` in `GenericFunctions.ts`.
 *
 * To Do is strictly user-scoped (no drive or site), so unlike the OneDrive/Excel nodes
 * there is no "Access As" selector — just a single required user target. The RLC uses ID
 * mode only (no `searchListMethod`) so rendering needs no Directory.Read.All — the user
 * pastes the id. The param name `userTarget` is kept identical to the sibling Microsoft
 * nodes so the transport reads it generically and workflow JSON stays portable.
 */
export const userTargetRLC: INodeProperties = {
	displayName: 'User',
	name: 'userTarget',
	type: 'resourceLocator',
	// Node-level target, not per-item: `noDataExpression` keeps it a fixed value for the whole
	// run, so the transport resolving it once (item 0) can never silently target the wrong user
	// from a per-item expression like `={{ $json.user }}`.
	noDataExpression: true,
	default: { mode: 'id', value: '' },
	required: true,
	modes: [
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. jane@contoso.com or a user object ID',
			hint: 'The user principal name (UPN) or object ID of the user whose To Do lists and tasks to act on',
		},
	],
	description:
		'The user whose To Do lists and tasks the Service Principal should act on. Applies to the whole node (every item in the execution).',
	displayOptions: {
		show: {
			authentication: ['microsoftEntraServicePrincipalApi'],
		},
	},
};

/** The app-only target params, spread into the node after the auth selector (user-only). */
export const targetDescription: INodeProperties[] = [userTargetRLC];
