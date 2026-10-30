import isEqual from 'lodash/isEqual';

import type { IWorkflowSettings } from './interfaces';

/**
 * - `version` saved with each workflow version, goes live on publish.
 * - `live` one value for the workflow, applies at once on save.
 */
export type WorkflowSettingScope = 'version' | 'live';

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

export const VERSIONED_WORKFLOW_SETTING_KEYS: readonly VersionedWorkflowSettingKey[] =
	Object.entries(WORKFLOW_SETTINGS_SCOPE)
		.filter(isVersionedEntry)
		.map(([key]) => key);

/**
 * Returns the version-scoped settings that have a value, or `null` when there
 * are none. A workflow history row stores this value.
 */
export function pickVersionedSettings(
	settings: IWorkflowSettings | null | undefined,
): VersionedWorkflowSettings | null {
	if (!settings) return null;

	const result: VersionedWorkflowSettings = {};
	let hasValue = false;
	for (const key of VERSIONED_WORKFLOW_SETTING_KEYS) {
		const value = settings[key];
		if (value === undefined || value === null) continue;
		result[key] = value;
		hasValue = true;
	}

	return hasValue ? result : null;
}

/**
 * Compares only the version-scoped settings. A missing value is not filled with
 * a default, so two versions with different values never compare as equal.
 */
export function versionedSettingsEqual(
	a: IWorkflowSettings | null | undefined,
	b: IWorkflowSettings | null | undefined,
): boolean {
	return isEqual(pickVersionedSettings(a), pickVersionedSettings(b));
}
