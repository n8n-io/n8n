import { EventEmitter, once } from 'events';
import net = require('net');
import tls = require('tls');

import {
	EnsureIrcFinalParam,
	EnsureIrcNick,
	EnsureIrcParam,
	IrcMessage,
	ParseIrcMessage,
} from './IrcParser';

export class IrcClient extends EventEmitter {
	private socket?: net.Socket | tls.TLSSocket;
	private usingTLS = false;
	private serverPassword?: string;
	private bufferedData = '';
	private rawLog = '';
	private errorMessage = '';
	connectionRegComplete = false;

	constructor(
		public nick: string,
		public ident: string,
		public realname: string,
		public saveRawLogs?: boolean,
	) {
		super();

		// throw errors for these values early
		this.nick = EnsureIrcNick(this.nick);
		this.ident = EnsureIrcParam(this.ident);
		this.realname = EnsureIrcFinalParam(this.realname);

		// setup default event handlers
		// e.g. PING, ENDOFMOTD/NOMOTD setting connectionRegComplete, SASL, BOT, etc.
		this.on('irc ping', this.handlePing);
		this.on('irc 001', this.handleWelcome);
		this.on('irc 005', this.handleIsupport);
		this.on('irc 376', this.handleRegComplete);
		this.on('irc 401', this.handleCannotSendMessage);
		this.on('irc 403', this.handleCannotJoinChannel);
		this.on('irc 404', this.handleCannotSendMessage);
		this.on('irc 422', this.handleRegComplete);
		this.on('irc 432', this.handleBadNick);
		this.on('irc 475', this.handleCannotJoinChannel);
	}

	private handlePing(message: IrcMessage) {
		this.send('', 'PONG', ...message.params);
	}

	private handleWelcome(message: IrcMessage) {
		// fix our nickname if it was truncated
		this.nick = message.params[0];
	}

	private handleIsupport(message: IrcMessage) {
		if (this.connectionRegComplete) {
			return;
		}
		// set BOT mode on ourselves
		message.params.forEach((param, i) => {
			if (i < message.params.length-1) {
				const split = param.split('=');
				if (split.length === 2 && split[0].toLowerCase() === 'bot') {
					this.send('', 'MODE', this.nick, `+${split[1]}`);
				}
			}
		});
	}

	private handleRegComplete(message: IrcMessage) {
		if (!this.connectionRegComplete) {
			this.connectionRegComplete = true;
			this.emit('connected');
		}
	}

	private handleCannotSendMessage(message: IrcMessage) {
		// earlier error message is usually the one to focus on,
		//  so don't overwrite it
		if (!this.errorMessage) {
			this.errorMessage = `could not send message: ${message.finalParam()}`;
		}
	}

	private handleBadNick(message: IrcMessage) {
		// we treat this as unrecoverable
		this.errorMessage = `nickname is not valid: ${message.finalParam()}`;
		this.send('', 'QUIT');
	}

	private handleCannotJoinChannel(message: IrcMessage) {
		this.errorMessage = `could not join channel: ${message.finalParam()}`;
	}

	connect(netConnectionOptions?: net.NetConnectOpts, tlsConnectionOptions?: tls.ConnectionOptions, serverPassword?: string): void {
		this.serverPassword = serverPassword;

		if (netConnectionOptions && tlsConnectionOptions) {
			throw new Error('You can only send either netConnectionOptions or tlsConnectionOptions, not both');
		} else if (tlsConnectionOptions) {
			this.socket = tls.connect(tlsConnectionOptions, () => {
				this.socketConnected();
			});
			this.usingTLS = true;
		} else if (netConnectionOptions) {
			this.socket = net.connect(netConnectionOptions, () => {
				this.socketConnected();
			});
		} else {
			throw new Error('You must send either netConnectionOptions or tlsConnectionOptions');
		}
		this.socket.setEncoding('utf8');
		this.socket.on('data', this.socketData.bind(this));
		this.socket.on('close', this.socketClosed.bind(this));
		this.socket.on('error', this.socketError.bind(this));
	}

	private socketConnected(): void {
		if (this.serverPassword) {
			this.sendLine(`PASS :${this.serverPassword}`);
		}
		this.send('', 'NICK', this.nick);
		this.send('', 'USER', this.ident, '0', '*', this.realname);
	}

	private socketData(input: Buffer|string): void {
		if (input instanceof Buffer) {
			// sometimes we can get an early empty buffer if we don't
			//  set the encoding in time
			input = input.toString();
		}
		this.bufferedData += input;

		// empty the buffer
		const messages = this.bufferedData.split('\n');

		this.bufferedData = messages.pop()!;

		messages.forEach(msgString => {
			msgString = msgString.replace(/\r/g, '');
			if (this.saveRawLogs) {
				this.rawLog += `<-  ${msgString}\n`;
			}
			// const message = ParseIrcMessage(msgString);
			console.log(msgString);
			const message = ParseIrcMessage(msgString);
			this.emit(`irc ${message.verb.toLowerCase()}`, message);
		});
	}

	private socketClosed(hadError: boolean): void {
		this.emit('closed', hadError);
	}

	private socketError(err: Error): void {
		this.errorMessage = `socket error: ${err.message}`;
	}

	send(prefix: string, verb: string, ...params: string[]): void {
		this.sendLine(new IrcMessage(prefix, verb, params).toString());
	}

	private sendLine(input: string): void {
		if (this.socket === undefined) {
			return;
		}
		console.log(input);
		this.socket.write(`${input}\r\n`);
		if (this.saveRawLogs) {
			this.rawLog += ` -> ${input}\n`;
		}
	}

	statusInfo() {
		return {
			'log': this.rawLog,
			'error': this.errorMessage,
		};
	}

	async runUntilClosed() {
		if (!this.socket || this.socket.destroyed) {
			return;
		}
		await once(this, 'closed');
	}
}
