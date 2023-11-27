import { WorkflowActivationError } from './workflow-activation.error';

export class WebhookTakenError extends WorkflowActivationError {
	constructor(nodeName: string, cause?: Error) {
		super(
			`The URL path that the "${nodeName}" node uses is already taken. Please change it to something else.`,
			{ severity: 'warning', cause },
		);
	}
}
