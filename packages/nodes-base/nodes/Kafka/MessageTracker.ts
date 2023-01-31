import { Consumer, Kafka, KafkaMessage } from "kafkajs";
import { sleep } from "n8n-workflow";

export class MessageTracker {
	messages: number[] = [];
	isClosing = false;


	received(message: KafkaMessage){
		this.messages.push(message.offset as unknown as number)
	}

	answered(message: KafkaMessage){
		if (this.messages.length === 0) {
			return;
		}

		const index = this.messages.findIndex((value) => value !== message.offset as unknown as number);
		this.messages.splice(index);
	}

	unansweredMessages() {
		return this.messages.length;
	}

	async closeChannel(consumer: Consumer) {
		if (this.isClosing) {
			return;
		}
		this.isClosing = true;

		let count = 0;
		let unansweredMessages = this.unansweredMessages();

		while (unansweredMessages !== 0 && count++ <= 300) {
			await sleep(1000);
			unansweredMessages = this.unansweredMessages();
		}

		await consumer.disconnect();
	}

}
