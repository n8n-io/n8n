export interface IMessage {
	type?: string;
	to?: string;
	topic?: string;
	content?: string;
	propagate_mode?: string;
}
