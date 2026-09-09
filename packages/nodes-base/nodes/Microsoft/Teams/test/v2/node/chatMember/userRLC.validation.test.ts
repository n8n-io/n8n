import type { INodePropertyMode, INodePropertyModeValidation } from 'n8n-workflow';

import { userRLC } from '../../../../v2/descriptions';

describe('Microsoft Teams V2 - userRLC By ID validation', () => {
	const byId = userRLC.modes?.find((mode) => mode.name === 'id') as INodePropertyMode;
	const { regex } = (byId.validation?.[0] as INodePropertyModeValidation).properties as {
		regex: string;
	};
	const matches = (value: string) => new RegExp(regex).test(value);

	it.each([
		['an object ID', 'e76f456f-5c3f-4f1e-9d5e-4d8f0f6ab111'],
		['a user principal name', 'jacob@contoso.com'],
		['a trailing-space principal name', 'jacob@contoso.com '],
	])('accepts %s', (_label, value) => {
		expect(matches(value)).toBe(true);
	});

	it.each([
		['a guest principal name', 'alias_contoso.com#EXT#@tenant.onmicrosoft.com'],
		['a bare fragment marker', 'jacob#@contoso.com'],
		['an empty value', ''],
		['a bare display name', 'Jacob Smith'],
	])('rejects %s', (_label, value) => {
		expect(matches(value)).toBe(false);
	});
});
