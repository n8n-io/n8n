import type { ITriggerFunctions } from 'n8n-workflow';
import type { Channel } from 'amqplib';
import type { MessageTracker } from '../GenericFunctions';

export function setCloseFunction(
	this: ITriggerFunctions,
	channel: Channel,
	messageTracker: MessageTracker,
	consumerTag: string,
): (() => Promise<void>) | undefined {
	if (this.getMode() === 'manual') {
		return async () => {
			await channel.close();
			await channel.connection.close();
			return;
		};
	} else {
		return async () => {
			try {
				return await messageTracker.closeChannel(channel, consumerTag);
			} catch (error) {
				const workflow = this.getWorkflow();
				const node = this.getNode();
				this.logger.error(
					`There was a problem closing the RabbitMQ Trigger node connection "${node.name}" in workflow "${workflow.id}": "${error.message}"`,
					{
						node: node.name,
						workflowId: workflow.id,
					},
				);
			}
		};
	}
}
