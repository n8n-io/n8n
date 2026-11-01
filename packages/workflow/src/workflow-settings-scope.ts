import isEqual from 'lodash/isEqual';

import type { IWorkflowSettings } from './interfaces';

/**
 * - `version` saved with each workflow version, goes live on publish.
 * - `live` one value for the workflow, applies at once on save.
 */
type WorkflowSettingScope = 'version' | 'live';

type ScopeForEverySetting = Record<keyof Required<IWorkflowSettings>, WorkflowSettingScope>;

export const WORKFLOW_SETTINGS_SCOPE = {
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

export function pickVersionedSettings(settings?: IWorkflowSettings): VersionedWorkflowSettings {
	const result: VersionedWorkflowSettings = {};
	for (const key of VERSIONED_WORKFLOW_SETTING_KEYS) {
		const value = settings?.[key];
		if (value === undefined || value === null) continue;
		result[key] = value;
	}

	return result;
}

export function versionedSettingsEqual(
	settingsA?: IWorkflowSettings,
	settingsB?: IWorkflowSettings,
): boolean {
	return isEqual(pickVersionedSettings(settingsA), pickVersionedSettings(settingsB));
}
