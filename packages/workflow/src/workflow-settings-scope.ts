import isEqual from 'lodash/isEqual';
import { z } from 'zod';

import { WORKFLOW_ENGINE_TYPES } from './constants';
import type { IWorkflowSettings } from './interfaces';

/**
 * - `version` saved with each workflow version, goes live on publish.
 * - `live` one value for the workflow, applies at once on save.
 */
type WorkflowSettingScope = 'version' | 'live';

type ScopeForEverySetting = Record<keyof Required<IWorkflowSettings>, WorkflowSettingScope>;

// Lists every setting, so a new setting without a scope does not compile.
const WORKFLOW_SETTINGS_SCOPE = {
	availableInMCP: 'live',
	binaryMode: 'live',
	callerIds: 'live',
	callerPolicy: 'live',
	credentialResolverId: 'live',
	customTelemetryTags: 'live',
	engineType: 'version',
	errorWorkflow: 'live',
	executionOrder: 'live',
	executionTimeout: 'live',
	redactCallerExecutions: 'live',
	redactionPolicy: 'live',
	saveDataErrorExecution: 'live',
	saveDataSuccessExecution: 'live',
	saveExecutionProgress: 'live',
	saveManualExecutions: 'live',
	timeSavedMode: 'live',
	timeSavedPerExecution: 'live',
	timezone: 'live',
} satisfies ScopeForEverySetting;

type SettingsScopeMap = typeof WORKFLOW_SETTINGS_SCOPE;

export type VersionedWorkflowSettingKey = {
	[K in keyof SettingsScopeMap]: SettingsScopeMap[K] extends 'version' ? K : never;
}[keyof SettingsScopeMap];

export type VersionedWorkflowSettings = Pick<IWorkflowSettings, VersionedWorkflowSettingKey>;

const isVersionedEntry = (
	entry: [string, WorkflowSettingScope],
): entry is [VersionedWorkflowSettingKey, 'version'] => entry[1] === 'version';

const VERSIONED_WORKFLOW_SETTING_KEYS: readonly VersionedWorkflowSettingKey[] = Object.entries(
	WORKFLOW_SETTINGS_SCOPE,
)
	.filter(isVersionedEntry)
	.map(([key]) => key);

const VERSIONED_SETTING_DEFAULTS: Readonly<Required<VersionedWorkflowSettings>> = Object.freeze({
	engineType: 'v1',
});

const versionedSettingsSchema = z
	.object({
		engineType: z.enum(WORKFLOW_ENGINE_TYPES).catch(VERSIONED_SETTING_DEFAULTS.engineType),
	})
	.catch(() => ({ ...VERSIONED_SETTING_DEFAULTS }));

/**
 * Returns the version-scoped settings, with the default for each setting that is missing
 * or invalid. So a new version always stores its engine, and `v1` compares equal to no engine.
 */
export function pickVersionedSettings(settings: unknown): Required<VersionedWorkflowSettings> {
	return versionedSettingsSchema.parse(settings);
}

export function versionedSettingsEqual(
	settingsA?: IWorkflowSettings | null,
	settingsB?: IWorkflowSettings | null,
): boolean {
	return isEqual(pickVersionedSettings(settingsA), pickVersionedSettings(settingsB));
}

/** Returns the settings without the version-scoped keys. */
export function omitVersionedSettings(settings?: IWorkflowSettings | null): IWorkflowSettings {
	const result = { ...settings };
	for (const key of VERSIONED_WORKFLOW_SETTING_KEYS) delete result[key];
	return result;
}

/**
 * Splits a settings update into a version-scoped change, which saves a new version,
 * and a live change, which applies at once. Without version scope, every change is live.
 */
export function compareWorkflowSettings(
	previous: IWorkflowSettings | null | undefined,
	next: IWorkflowSettings | undefined,
	versionScoped: boolean,
): { versioned: boolean; live: boolean } {
	if (next === undefined) return { versioned: false, live: false };
	if (!versionScoped) return { versioned: false, live: !isEqual(previous, next) };
	return {
		versioned: !versionedSettingsEqual(previous, next),
		live: !isEqual(omitVersionedSettings(previous), omitVersionedSettings(next)),
	};
}

/**
 * Sets the given version-scoped settings on the workflow settings, and keeps a setting
 * that `versionSettings` does not set. To apply a stored version, pass the result of
 * `pickVersionedSettings`, so that a missing value is already the default.
 */
export function applyVersionedSettings(
	settings: IWorkflowSettings | null | undefined,
	versionSettings: VersionedWorkflowSettings,
): IWorkflowSettings {
	const result: IWorkflowSettings = { ...settings };
	for (const key of VERSIONED_WORKFLOW_SETTING_KEYS) {
		const value = versionSettings[key];
		if (value !== undefined) result[key] = value;
	}
	return result;
}
