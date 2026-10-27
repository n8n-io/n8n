/**
 * Auto-publish mode options for workflow imports from source control.
 * - 'none': Don't auto-publish any workflows
 * - 'published': Auto-publish only workflows that were previously published
 * - 'all': Auto-publish all workflows
 */
export type AutoPublishMode = 'none' | 'published' | 'all';

/**
 * Determines if a workflow should be published during import based on auto-publish settings.
 *
 * @param isNewWorkflow - Whether this is a new workflow (created) or existing (modified)
 * @param isLocalPublished - Whether the local workflow was previously active/published
 * @param isRemoteArchived - Whether the remote workflow is currently archived
 * @param autoPublish - The auto-publish mode selected by the user
 */
export function shouldAutoPublishWorkflow(params: {
	isNewWorkflow: boolean;
	isLocalPublished: boolean;
	isRemoteArchived: boolean;
	autoPublish: AutoPublishMode;
}): boolean {
	const { isNewWorkflow, isLocalPublished, isRemoteArchived, autoPublish } = params;

	// Archived workflows should never be activated
	if (isRemoteArchived) {
		return false;
	}

	if (autoPublish === 'all') {
		return true;
	}

	// For 'published' mode, only activate existing workflows that were previously active
	if (autoPublish === 'published' && !isNewWorkflow && isLocalPublished) {
		return true;
	}

	return false;
}
