import type { IWorkflowSettings } from './interfaces';

/**
 * - `version`: saved with each workflow version, goes live on publish.
 * - `live`: one value for the workflow, applies at once on save.
 */
export type WorkflowSettingScope = 'version' | 'live';

/**
 * The scope of every workflow setting. A new setting without a scope does not
 * compile. Settings that control access, data protection or records stay `live`.
 */
export const WORKFLOW_SETTINGS_SCOPE = {
	timezone: 'live',
	errorWorkflow: 'live',
	callerIds: 'live',
	callerPolicy: 'live',
	saveDataErrorExecution: 'live',
	saveDataSuccessExecution: 'live',
	saveManualExecutions: 'live',
	saveExecutionProgress: 'live',
	executionTimeout: 'live',
	executionOrder: 'live',
	engineType: 'version',
	binaryMode: 'live',
	timeSavedPerExecution: 'live',
	timeSavedMode: 'live',
	availableInMCP: 'live',
	credentialResolverId: 'live',
	redactionPolicy: 'live',
	redactCallerExecutions: 'live',
	customTelemetryTags: 'live',
} as const satisfies Record<keyof Required<IWorkflowSettings>, WorkflowSettingScope>;

type SettingsScopeMap = typeof WORKFLOW_SETTINGS_SCOPE;

export type VersionedWorkflowSettingKey = {
	[K in keyof SettingsScopeMap]: SettingsScopeMap[K] extends 'version' ? K : never;
}[keyof SettingsScopeMap];

export type VersionedWorkflowSettings = Pick<IWorkflowSettings, VersionedWorkflowSettingKey>;
