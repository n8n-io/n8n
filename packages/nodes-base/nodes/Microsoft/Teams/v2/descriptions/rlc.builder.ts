import type { INodeProperties, INodePropertyMode } from 'n8n-workflow';

import { SERVICE_PRINCIPAL_AUTH } from '../transport';

type RlcSpec = Omit<INodeProperties, 'type' | 'default' | 'modes' | 'typeOptions'> & {
	/** Ordered, never empty. The first mode is the default mode. */
	modes: [INodePropertyMode, ...INodePropertyMode[]];
	/** Emitted as `typeOptions.loadOptionsDependsOn`. The key is absent when omitted. */
	dependsOn?: string[];
};

/**
 * One resource locator from a declarative spec. Every key that is not derived passes through
 * untouched, so key presence is the spec's: `memberRLC` has no `required`, `groupRLC` and
 * `memberRLC` have no `description`.
 */
export const makeRLC = ({ dependsOn, ...spec }: RlcSpec): INodeProperties => ({
	...spec,
	type: 'resourceLocator',
	default: { mode: spec.modes[0].name, value: '' },
	...(dependsOn ? { typeOptions: { loadOptionsDependsOn: dependsOn } } : {}),
});

export const listMode = (searchListMethod: string, placeholder: string): INodePropertyMode => {
	// A resource-locator mode, not a parameter. The rule exempts a mode literal only when it
	// sits under a `modes` key, so a helper that returns one needs this line.
	// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
	return {
		displayName: 'From List',
		name: 'list',
		type: 'list',
		placeholder,
		typeOptions: {
			searchListMethod,
			searchable: true,
		},
	};
};

export const idMode = (
	mode: Omit<INodePropertyMode, 'displayName' | 'name' | 'type'>,
): INodePropertyMode => {
	// Same reason as in `listMode`.
	// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
	return {
		displayName: 'By ID',
		name: 'id',
		type: 'string',
		...mode,
	};
};

// A v4 GUID: the shape of a team (group) ID and of a group member ID.
const GUID_V4 = '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})';

/**
 * By-ID mode for a v4 GUID, shared by `teamRLC`, `groupRLC` and `memberRLC`. The "Team ID"
 * error copy is wrong for a member. Keep it here: this builder is a pure refactor, and the copy
 * fix is a follow-up ticket with its own `.snap` diff.
 */
export const guidIdMode = (placeholder: string): INodePropertyMode =>
	idMode({
		placeholder,
		validation: [
			{
				type: 'regex',
				properties: {
					regex: `${GUID_V4}[ \t]*`,
					errorMessage: 'Not a valid Microsoft Teams Team ID',
				},
			},
		],
		extractValue: {
			type: 'regex',
			regex: GUID_V4,
		},
	});

/**
 * Builds the SP-shown By-ID copy of a Planner RLC (plan/bucket/member). App-only
 * Graph has no group-scoped list to depend on (the group picker is hidden under SP),
 * so a list-mode picker would auto-fire its `loadOptionsMethod` against an empty
 * group and hit the SP empty-id validation error. This copy defaults to By-ID and
 * drops list mode + `typeOptions` (incl. `loadOptionsDependsOn`), and is shown only
 * under the Service Principal credential. Shared by `task:create`/`update`/`getAll`
 * so the rule lives in one place (OAuth2 list pickers are untouched).
 */
export const byIdUnderSp = (
	rlc: INodeProperties,
	overrides: Partial<INodeProperties> = {},
): INodeProperties => ({
	...rlc,
	...overrides,
	default: { mode: 'id', value: '' },
	modes: (rlc.modes ?? []).filter((mode) => mode.name === 'id'),
	typeOptions: undefined,
	displayOptions: {
		show: {
			'/authentication': [SERVICE_PRINCIPAL_AUTH],
		},
	},
});
