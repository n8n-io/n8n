// ensure that the given nickname doesn't contain any protocol-breaking characters
export function EnsureIrcNick(nick: string): string {
	nick = EnsureIrcParam(nick);
	if (nick.includes(',') || nick.includes('*') || nick.includes('?') ||
		nick.includes('.') || nick.includes('!') || nick.includes('@')) {
		throw new Error(`Nickname [${nick}] can't include [,*?.!@]`);
	}

	return nick;
}

// ensure that the given input is a valid irc param
export function EnsureIrcParam(input: string): string {
	input = input.trim();
	if (!input) {
		throw new Error(`Required property is empty`);
	}
	if (input.startsWith(':') || input.includes(' ') ||
		input.includes('\r') || input.includes('\n')) {
		throw new Error(`Property [${input}] can't start with a colon (:) or contain spaces/newlines`);
	}

	return input;
}

// ensure that the given input is a valid final irc param
export function EnsureIrcFinalParam(input: string): string {
	input = input.trim();
	if (input.includes('\r') || input.includes('\n')) {
		throw new Error(`Property [${input}] can't contain newlines`);
	}

	return input;
}

export class IrcMessage {
	constructor(
		public prefix: string,
		public verb: string,
		public params: string[],
	) {
		this.ensureParts();
	}

	private ensureParts(): void {
		// ensure that parts in this message are correct and
		//  throw an error otherwise
		if (this.prefix) {
			this.prefix = EnsureIrcParam(this.prefix);
		}
		this.verb = EnsureIrcParam(this.verb);
		this.params.forEach((param, i) => {
			if (i === this.params.length-1) {
				EnsureIrcFinalParam(param);
			} else {
				EnsureIrcParam(param);
			}
		});
	}

	toString(): string {
		this.ensureParts();

		let messageParts: string[] = [];

		if (this.prefix) {
			messageParts.push(`:${this.prefix}`);
		}
		messageParts.push(this.verb);
		if (this.params) {
			messageParts = messageParts.concat(this.params);

			try {
				EnsureIrcParam(messageParts[messageParts.length-1]);
			} catch {
				messageParts[messageParts.length-1] = `:${messageParts[messageParts.length-1]}`;
			}
		}

		return messageParts.join(' ');
	}

	finalParam(): string {
		return this.params ? this.params[this.params.length-1] : '';
	}
}

export function ParseIrcMessage(input: string): IrcMessage {
	// input setup and checks.
	// trim beginning whitespace and \r\n chars at the end
	input = input.trimLeft().replace(/[\r\n]+$/, '');
	if (input.includes('\r') || input.includes('\n')) {
		throw new Error('IRC message cannot be parsed, contains \\r\\n');
	}
	if (input.trim() === '') {
		throw new Error('IRC message cannot be parsed, is empty');
	}

	// parse message into parts
	let i = 0; // start index
	let j = 0; // end index
	const invalidMessageError = Error('IRC message cannot be parsed, is invalid');

	// ignore tags for now

	// prefix
	let prefix = '';
	if (input[0] === ':') {
		j = i+1;
		while (input[j] !== ' ') {
			j++;
			if (input.length <= j) {
				throw invalidMessageError;
			}
		}
		prefix = input.substring(i+1, j);
		while (input[j] === ' ') {
			j++;
			if (input.length <= j) {
				throw invalidMessageError;
			}
		}
		i = j;
	}

	// verb
	let verb = '';
	j = i;
	while (input[j] !== ' ') {
		j++;
		if (input.length <= j) {
			break;
		}
	}
	verb = input.substring(i, j);
	if (j < input.length) {
		while (input[j] === ' ') {
			j++;
			if (input.length <= j) {
				break;
			}
		}
	}
	i = j;

	// params
	const params: string[] = [];
	let trailingHit = false;
	while (i < input.length) {
		if (input[i] === ':') {
			trailingHit = true;
			params.push(input.substring(i+1));
			break;
		}

		j = i;
		while (input[j] !== ' ') {
			j++;
			if (input.length <= j) {
				break;
			}
		}
		params.push(input.substring(i, j));

		if (j < input.length) {
			while (input[j] === ' ') {
				j++;
				if (input.length <= j) {
					break;
				}
			}
		}
		i = j;
	}
	if (!trailingHit && input[i] === ' ') {
		params.push('');
	}

	// output
	return new IrcMessage(prefix, verb, params);
}
