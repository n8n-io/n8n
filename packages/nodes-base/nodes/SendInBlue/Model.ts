export interface Sender {
	name?: string;
	email?: string;
	id?: number;
}

export interface Receiver {
	name: string;
	email: string;
}

export interface TransactionalEmail {
	sender: Sender;
	to: Receiver[];
	textContent?: string;
	htmlContent?: string;
	subject: string;
}
