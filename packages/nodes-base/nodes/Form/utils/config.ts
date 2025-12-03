/**
 * Configuration interface for form webhook utilities.
 * All version-specific behavior is controlled through this config object.
 * This is the SINGLE source of truth for all version checks.
 */
export interface FormWebhookConfig {
	// Runtime flags
	requireAuth?: boolean; // v2+ requires auth
	defaultUseWorkflowTimezone?: boolean; // v2.1+ defaults to true
	allowRespondToWebhook?: boolean; // v2.2+ doesn't allow
	useFieldName?: boolean; // v2.4+ uses fieldName instead of fieldLabel

	// UI flags (for display options)
	showWebhookPath?: boolean; // Show webhookPath in main properties (v2.1 and below)
	showWebhookPathInOptions?: boolean; // Show webhookPath in options collection (v2.2+)
}
