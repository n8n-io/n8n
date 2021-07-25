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
	timesNickWasInUse = 0;
	connectionRegComplete = false;

	private saslPlainUsername = '';
	private saslPlainPassword = '';
	private saslRequired = false;
	account = '';

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
		this.on('irc authenticate', this.handleAuthenticate);
		this.on('irc cap', this.handleCap);
		this.on('irc ping', this.handlePing);
		this.on('irc 001', this.handleWelcome);
		this.on('irc 005', this.handleIsupport);
		this.on('irc 376', this.handleRegComplete);
		this.on('irc 401', this.handleCannotSendMessage);
		this.on('irc 403', this.handleCannotJoinChannel);
		this.on('irc 404', this.handleCannotSendMessage);
		this.on('irc 422', this.handleRegComplete);
		this.on('irc 432', this.handleBadNick);
		this.on('irc 433', this.handleNickInUse);
		this.on('irc 475', this.handleCannotJoinChannel);
		this.on('irc 900', this.handleLoggedIn);
		this.on('irc 903', this.handleSaslSuccess);
		this.on('irc 904', this.handleSaslFail);
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

	//
	// socket handlers
	//
	private socketConnected(): void {
		if (this.serverPassword) {
			this.send('PASS', this.serverPassword);
		}
		if (this.saslPlainUsername || this.saslRequired) {
			this.send('CAP', 'REQ', 'sasl');
		}
		this.send('NICK', this.nick);
		this.send('USER', this.ident, '0', '*', this.realname);
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

	//
	// irc message handlers
	//
	private handleAuthenticate(message: IrcMessage) {
		if (message.params && message.params[0] === '+') {
			const saslBlob = Buffer.from(`${this.saslPlainUsername}\x00${this.saslPlainUsername}\x00${this.saslPlainPassword}`).toString('base64');
			this.send('AUTHENTICATE', saslBlob);
		} else {
			this.errorMessage = `SASL handleAuthenticate failed, we unexpectedly got [${message.toString()}]`;
			this.send('QUIT');
		}
	}

	private handleCap(message: IrcMessage) {
		if (message.params.length > 2 && message.params[1].toLowerCase() === 'ack') {
			this.send('AUTHENTICATE', 'PLAIN');
		} else if (this.saslRequired) {
			// REQ sasl failed for an unspecified reason and we require it
			this.errorMessage = 'SASL Login failed, could not request capability (maybe services is down)';
			this.send('QUIT');
		} else {
			// REQ sasl failed for an unspecified reason
			this.send('CAP', 'END');
		}
	}

	private handlePing(message: IrcMessage) {
		this.send('PONG', ...message.params);
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
					this.send('MODE', this.nick, `+${split[1]}`);
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
			this.errorMessage = `Could not send message: ${message.finalParam()}`;
		}
	}

	private handleBadNick(message: IrcMessage) {
		// we treat this as unrecoverable
		this.errorMessage = `Nickname is not valid: ${message.finalParam()}`;
		this.send('QUIT');
	}

	private handleNickInUse(message: IrcMessage) {
		if (!this.connectionRegComplete) {
			this.timesNickWasInUse += 1;
			if (this.timesNickWasInUse > 5) {
				this.errorMessage = 'Nick was in use';
				this.send('QUIT');
				return;
			}
			this.send('NICK', message.params[1]+'_');
		}
	}

	private handleCannotJoinChannel(message: IrcMessage) {
		this.errorMessage = `Could not join channel: ${message.finalParam()}`;
	}

	private handleLoggedIn(message: IrcMessage) {
		if (message.params.length > 2) {
			this.account = message.params[2];
		}
	}

	private handleSaslSuccess(message: IrcMessage) {
		this.send('CAP', 'END');
	}

	private handleSaslFail(message: IrcMessage) {
		if (this.saslRequired) {
			this.errorMessage = `[904] ${message.finalParam()}`;
			this.send('QUIT');
		} else {
			this.send('CAP', 'END');
		}
	}

	//
	// utility functions
	//
	setupSaslPlain(username: string, password: string, required?: boolean) {
		this.saslPlainUsername = username;
		this.saslPlainPassword = password;
		if (required !== undefined) {
			this.saslRequired = required;
		}
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

	send(verb: string, ...params: string[]): void {
		this.sendLine(new IrcMessage('', verb, params).toString());
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
