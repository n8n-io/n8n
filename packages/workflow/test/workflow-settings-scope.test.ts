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
		['null settings', null],
		['undefined settings', undefined],
		['empty settings', {}],
		['only live settings', { availableInMCP: true }],
		['an unknown engine', { engineType: 'v3' }],
		['an engine of the wrong type', { engineType: 2 }],
		['a null engine', { engineType: null }],
		['settings that are a string', 'not an object'],
		['settings that are an array', []],
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

	it('returns empty settings for null', () => {
		expect(omitVersionedSettings(null)).toEqual({});
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
			applyVersionedSettings({ engineType: 'v2', availableInMCP: true }, { engineType: 'v1' }),
		).toEqual({ engineType: 'v1', availableInMCP: true });
	});

	// A version saved before history stored settings has none.
	it('keeps a version-scoped setting that the version does not set', () => {
		expect(applyVersionedSettings({ engineType: 'v2' }, {})).toEqual({ engineType: 'v2' });
	});

	it('accepts null settings', () => {
		expect(applyVersionedSettings(null, { engineType: 'v2' })).toEqual({
			engineType: 'v2',
		});
	});
});
