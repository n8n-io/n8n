import { createTransport } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export type EmailSendOptions = {
	appendAttribution?: boolean;
	allowUnauthorizedCerts?: boolean;
	attachments?: string;
	ccEmail?: string;
	bccEmail?: string;
	replyTo?: string;
};

export function configureTransport(options: EmailSendOptions) {
	// TODO: Update to take from ENV or internal config
	const credentials = {
		host: 'host',
		port: 465,
		secure: false,
		disableStartTls: false,
		hostName: 'hostName',
		user: 'xxx',
		password: 'yyy',
	};

	const connectionOptions: SMTPTransport.Options = {
		host: credentials.host,
		port: credentials.port,
		secure: credentials.secure as boolean,
	};

	if (!credentials.secure) {
		connectionOptions.ignoreTLS = credentials.disableStartTls as boolean;
	}

	if (typeof credentials.hostName === 'string' && credentials.hostName) {
		connectionOptions.name = credentials.hostName;
	}

	if (credentials.user || credentials.password) {
		connectionOptions.auth = {
			user: credentials.user,
			pass: credentials.password,
		};
	}

	if (options.allowUnauthorizedCerts === true) {
		connectionOptions.tls = {
			rejectUnauthorized: false,
		};
	}

	return createTransport(connectionOptions);
}
