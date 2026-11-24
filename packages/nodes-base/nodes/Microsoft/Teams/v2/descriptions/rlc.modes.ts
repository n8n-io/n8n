import type { INodePropertyMode } from 'n8n-workflow';

// `listMode` and `idMode` return resource-locator modes, not parameters. The rule exempts a
// mode literal only when it sits under a `modes` key, so the two return values need this disable.
/* eslint-disable n8n-nodes-base/node-param-default-missing */
export const listMode = (searchListMethod: string, placeholder: string): INodePropertyMode => ({
	displayName: 'From List',
	name: 'list',
	type: 'list',
	placeholder,
	typeOptions: {
		searchListMethod,
		searchable: true,
	},
});

export const idMode = (
	mode: Omit<INodePropertyMode, 'displayName' | 'name' | 'type'>,
): INodePropertyMode => ({
	displayName: 'By ID',
	name: 'id',
	type: 'string',
	...mode,
});
/* eslint-enable n8n-nodes-base/node-param-default-missing */

// A v4 GUID: the shape of a team (group) ID and of a group member ID.
const GUID_V4_REGEX = '^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})';

/**
 * By-ID mode for a v4 GUID, shared by `teamRLC`, `groupRLC` and `memberRLC`. The regex is
 * shared. The error copy belongs to the caller.
 */
export const guidIdMode = (placeholder: string, errorMessage: string): INodePropertyMode =>
	idMode({
		placeholder,
		validation: [
			{
				type: 'regex',
				properties: {
					regex: `${GUID_V4_REGEX}[ \t]*`,
					errorMessage,
				},
			},
		],
		extractValue: {
			type: 'regex',
			regex: GUID_V4_REGEX,
		},
	});
