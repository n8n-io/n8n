import { pickVersionedSettings, versionedSettingsEqual } from '../src/workflow-settings-scope';

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
