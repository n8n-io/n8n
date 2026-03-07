import type { IExecuteFunctions, IHookFunctions, IWebhookFunctions } from 'n8n-workflow';
import { jiraSoftwareCloudApiRequest } from './GenericFunctions';
import type { JiraWebhookPayload } from './JiraWebhookValidator';

/**
 * Validates if an issue matches a JQL filter by querying Jira API
 * This ensures JQL filters are enforced at runtime, not just during webhook registration
 */
export async function validateIssueAgainstJql(
	context: IWebhookFunctions | IExecuteFunctions | IHookFunctions,
	issueKey: string,
	jqlFilter: string,
): Promise<boolean> {
	if (!jqlFilter || jqlFilter.trim() === '') {
		// No filter means all issues pass
		return true;
	}

	try {
		// Construct a JQL query that checks if the specific issue matches the filter
		// We combine the user's JQL with an issue key filter
		const combinedJql = `key = ${issueKey} AND (${jqlFilter})`;

		// Query Jira to see if the issue matches
		const response = await jiraSoftwareCloudApiRequest.call(
			context,
			'/api/2/search',
			'GET',
			{},
			{
				jql: combinedJql,
				maxResults: 1,
				fields: 'key', // We only need to know if it exists
			},
		);

		// If the search returns the issue, it matches the filter
		return response.total > 0;
	} catch (error) {
		// If there's an error querying Jira (e.g., invalid JQL), log it and allow the event
		// This prevents JQL syntax errors from blocking all webhooks
		context.logger.warn(
			`Failed to validate issue ${issueKey} against JQL filter: ${error.message}`,
			{
				jqlFilter,
				error: error.message,
			},
		);
		return true;
	}
}

/**
 * Extracts the issue key from a webhook payload
 */
export function extractIssueKey(payload: JiraWebhookPayload): string | null {
	return payload.issue?.key || null;
}

/**
 * Checks if the webhook event is issue-related and should be filtered by JQL
 */
export function isIssueRelatedEvent(webhookEvent: string): boolean {
	const issueEvents = [
		'jira:issue_created',
		'jira:issue_updated',
		'jira:issue_deleted',
		'comment_created',
		'comment_updated',
		'comment_deleted',
	];

	return issueEvents.includes(webhookEvent);
}
