import type { INodePropertyModeValidation } from 'n8n-workflow';

import { workbookRLC, workbookSourceOption } from '../../v2/actions/common.descriptions';

describe('Microsoft Excel V2 - workbook Source option', () => {
	it('is a single "Source" dropdown for the options collection', () => {
		expect(workbookSourceOption.name).toBe('workbookSource');
		expect(workbookSourceOption.type).toBe('options');
		expect(workbookSourceOption.displayName).toBe('Source');
	});

	it('offers the OneDrive, SharePoint and Everything sources', () => {
		const values = (workbookSourceOption.options as Array<{ value: string }>).map(
			(option) => option.value,
		);
		expect(values).toEqual(['all', 'oneDrive', 'sharePoint']);
	});

	it('is not version-gated itself (the effective default is resolved in code)', () => {
		expect(workbookSourceOption.displayOptions).toBeUndefined();
	});
});

describe('Microsoft Excel V2 - workbook resource locator By-ID validation', () => {
	const idMode = workbookRLC.modes?.find((mode) => mode.name === 'id');
	const validation = idMode?.validation?.[0] as INodePropertyModeValidation;
	const regexStr = (validation.properties as { regex: string }).regex;

	// n8n anchors resource-locator validation regexes with ^...$ (node-helpers.ts),
	// so replicate that here to test the effective validation behaviour.
	const isValid = (value: string) => new RegExp(`^${regexStr}$`).test(value);

	it('accepts a typical alphanumeric workbook ID', () => {
		expect(isValid('016LYZ3HQLTTXHTQCNKVCZDNMBGHYD3ROY')).toBe(true);
	});

	it('accepts workbook IDs containing - and _', () => {
		expect(isValid('01ABC-DEF_123')).toBe(true);
	});

	it('accepts a composite "driveId/itemId" value from search results', () => {
		expect(isValid('b!aW0DNIreC0OqxM8L/016LYZ3HV5VLDXAMOGS5H3BVPJ7NHIY6PC')).toBe(true);
	});

	it('rejects empty or single-character input', () => {
		expect(isValid('')).toBe(false);
		expect(isValid('a')).toBe(false);
	});
});
