import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';

export function prepareMessage(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	message: string,
	messageType: string,
	includeLinkToWorkflow: boolean,
	instanceId?: string,
) {
	if (includeLinkToWorkflow) {
		const { id } = this.getWorkflow();
		const link = `${this.getInstanceBaseUrl()}workflow/${id}?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=${encodeURIComponent(
			'n8n-nodes-base.microsoftTeams',
		)}${instanceId ? '_' + instanceId : ''}`;
		messageType = 'html';
		message = `${message}<br><br><em> Powered by <a href="${link}">this n8n workflow</a> </em>`;
	}

	return {
		body: {
			contentType: messageType,
			content: message,
		},
	};
}
