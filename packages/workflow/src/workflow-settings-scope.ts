import isEqual from 'lodash/isEqual';
import { z } from 'zod';

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

/** The value of a version-scoped setting that the workflow settings do not set. */
const VERSIONED_SETTING_DEFAULTS: Required<VersionedWorkflowSettings> = { engineType: 'v1' };

// The stored settings are plain JSON, so a value can be missing or invalid.
const versionedSettingsSchema = z
	.object({
		engineType: z.enum(['v1', 'v2']).catch(VERSIONED_SETTING_DEFAULTS.engineType),
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
	settingsA?: IWorkflowSettings,
	settingsB?: IWorkflowSettings,
): boolean {
	return isEqual(pickVersionedSettings(settingsA), pickVersionedSettings(settingsB));
}
