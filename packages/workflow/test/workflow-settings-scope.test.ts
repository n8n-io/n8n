import {
	applyVersionedSettings,
	omitVersionedSettings,
	pickVersionedSettings,
	versionedSettingsEqual,
} from '../src/workflow-settings-scope';

describe('pickVersionedSettings', () => {
	it('returns only the version-scoped settings', () => {
		expect(pickVersionedSettings({ engineType: 'v2', availableInMCP: true })).toEqual({
			engineType: 'v2',
		});
	});

	it.each([
		['undefined settings', undefined],
		['empty settings', {}],
		['only live settings', { availableInMCP: true }],
	])('returns an empty object for %s', (_, settings) => {
		expect(pickVersionedSettings(settings)).toEqual({});
	});
});

describe('versionedSettingsEqual', () => {
	it('ignores live settings', () => {
		expect(
			versionedSettingsEqual(
				{ engineType: 'v2', availableInMCP: true },
				{ engineType: 'v2', availableInMCP: false },
			),
		).toBe(true);
	});

	it('detects another engine', () => {
		expect(versionedSettingsEqual({ engineType: 'v1' }, { engineType: 'v2' })).toBe(false);
	});

	it('treats an unset engine as different from a set one', () => {
		expect(versionedSettingsEqual({}, { engineType: 'v1' })).toBe(false);
	});

	it('treats missing and empty settings as equal', () => {
		expect(versionedSettingsEqual(undefined, {})).toBe(true);
	});
});

describe('omitVersionedSettings', () => {
	it('removes the version-scoped settings', () => {
		expect(omitVersionedSettings({ engineType: 'v2', timezone: 'Europe/Berlin' })).toEqual({
			timezone: 'Europe/Berlin',
		});
	});

	it.each([null, undefined])('returns %s unchanged', (settings) => {
		expect(omitVersionedSettings(settings)).toBe(settings);
	});
});

describe('applyVersionedSettings', () => {
	it('takes the version-scoped settings from the version and keeps the others', () => {
		expect(
			applyVersionedSettings(
				{ engineType: 'v2', timezone: 'Europe/Berlin' },
				{ engineType: 'v1', timezone: 'UTC' },
			),
		).toEqual({ engineType: 'v1', timezone: 'Europe/Berlin' });
	});

	it('clears a version-scoped setting that the version does not set', () => {
		const result = applyVersionedSettings({ engineType: 'v2', timezone: 'UTC' }, {});

		expect(result).toHaveProperty('engineType', undefined);
		expect({ engineType: 'v2', ...result }).toHaveProperty('engineType', undefined);
	});

	it('accepts missing settings', () => {
		expect(applyVersionedSettings(undefined, { engineType: 'v2' })).toEqual({
			engineType: 'v2',
		});
	});
});
