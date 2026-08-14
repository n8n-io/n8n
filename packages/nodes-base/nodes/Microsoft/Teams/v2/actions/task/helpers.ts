import type { INodeProperties } from 'n8n-workflow';

import { SERVICE_PRINCIPAL_AUTH } from '../../transport';

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
