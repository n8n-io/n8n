import {
	pickVersionedSettings,
	versionedSettingsEqual,
	WORKFLOW_SETTINGS_SCOPE,
} from '../src/workflow-settings-scope';

describe('WORKFLOW_SETTINGS_SCOPE', () => {
	it('versions the engine', () => {
		expect(WORKFLOW_SETTINGS_SCOPE.engineType).toBe('version');
	});
});

describe('pickVersionedSettings', () => {
	it('returns only the version-scoped settings', () => {
		expect(
			pickVersionedSettings({ engineType: 'v2', timezone: 'Europe/Berlin', callerPolicy: 'any' }),
		).toEqual({ engineType: 'v2' });
	});

	it.each([
		['null settings', null],
		['undefined settings', undefined],
		['empty settings', {}],
		['only live settings', { timezone: 'Europe/Berlin' }],
	])('returns null for %s', (_, settings) => {
		expect(pickVersionedSettings(settings)).toBeNull();
	});
});

describe('versionedSettingsEqual', () => {
	it('ignores live settings', () => {
		expect(
			versionedSettingsEqual(
				{ engineType: 'v2', timezone: 'Europe/Berlin' },
				{ engineType: 'v2', timezone: 'UTC' },
			),
		).toBe(true);
	});

	it('detects another engine', () => {
		expect(versionedSettingsEqual({ engineType: 'v1' }, { engineType: 'v2' })).toBe(false);
	});

	it('treats an unset engine as different from a set one', () => {
		expect(versionedSettingsEqual(null, { engineType: 'v1' })).toBe(false);
	});

	it('treats null and empty settings as equal', () => {
		expect(versionedSettingsEqual(null, {})).toBe(true);
	});
});
