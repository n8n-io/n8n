import type { VersionedWorkflowSettingKey } from '../src/workflow-settings-scope';
import {
	applyVersionedSettings,
	omitVersionedSettings,
	pickVersionedSettings,
	versionedSettingsEqual,
} from '../src/workflow-settings-scope';

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

describe('omitVersionedSettings', () => {
	it('removes the version-scoped settings', () => {
		expect(omitVersionedSettings({ engineType: 'v2', availableInMCP: true })).toEqual({
			availableInMCP: true,
		});
	});

	it('returns null unchanged', () => {
		expect(omitVersionedSettings(null)).toBeNull();
	});

	it('does not change the settings it receives', () => {
		const settings = { engineType: 'v2' as const, availableInMCP: true };

		omitVersionedSettings(settings);

		expect(settings).toEqual({ engineType: 'v2', availableInMCP: true });
	});
});

describe('applyVersionedSettings', () => {
	it('takes the version-scoped settings from the version and keeps the others', () => {
		expect(
			applyVersionedSettings(
				{ engineType: 'v2', availableInMCP: true },
				{ engineType: 'v1', availableInMCP: false },
			),
		).toEqual({ engineType: 'v1', availableInMCP: true });
	});

	it('clears a version-scoped setting that the version does not set', () => {
		const result = applyVersionedSettings({ engineType: 'v2' }, {});

		expect(result).toHaveProperty('engineType', undefined);
		expect({ engineType: 'v2', ...result }).toHaveProperty('engineType', undefined);
	});

	it('accepts null settings', () => {
		expect(applyVersionedSettings(null, { engineType: 'v2' })).toEqual({
			engineType: 'v2',
		});
	});
});
