import type { INodeProperties } from 'n8n-workflow';

export const disableDotNotationBoolean: INodeProperties = {
	displayName: 'Disable Dot Notation',
	name: 'disableDotNotation',
	type: 'boolean',
	default: false,
	description:
		'Whether to disallow referencing child fields using `parent.child` in the field name',
};
