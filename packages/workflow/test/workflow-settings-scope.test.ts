import type { VersionedWorkflowSettingKey } from '../src/workflow-settings-scope';
import { pickVersionedSettings, versionedSettingsEqual } from '../src/workflow-settings-scope';

describe('VersionedWorkflowSettingKey', () => {
	it('versions only the engine', () => {
		expectTypeOf<VersionedWorkflowSettingKey>().toEqualTypeOf<'engineType'>();
	});
});

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
	])('returns the default engine for %s', (_, settings) => {
		expect(pickVersionedSettings(settings)).toEqual({ engineType: 'v1' });
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

	it('treats an unset engine as v1', () => {
		expect(versionedSettingsEqual({}, { engineType: 'v1' })).toBe(true);
	});

	it('treats missing and empty settings as equal', () => {
		expect(versionedSettingsEqual(undefined, {})).toBe(true);
	});
});
