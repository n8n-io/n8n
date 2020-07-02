import {
	OptionsWithUri,
} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	ILoadOptionsFunctions,
} from 'n8n-core';

import {
	IDataObject,
} from 'n8n-workflow';

import {
	IEmail,
} from './Gmail.node';

export async function googleApiRequest(this: IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions, method: string,
	endpoint: string, body: any = {}, qs: IDataObject = {}, uri?: string, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	let options: OptionsWithUri = {
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs,
		uri: uri || `https://www.googleapis.com${endpoint}`,
		json: true,
	};

	options = Object.assign({}, options, option);

	try {
		if (Object.keys(body).length === 0) {
			delete options.body;
		}

		//@ts-ignore
		return await this.helpers.requestOAuth2.call(this, 'gmailOAuth2', options);

	} catch (error) {
		if (error.response && error.response.body && error.response.body.error) {

			let errorMessages;

			if (error.response.body.error.errors) {
				// Try to return the error prettier
				errorMessages = error.response.body.error.errors;

				errorMessages = errorMessages.map((errorItem: IDataObject) => errorItem.message);

				errorMessages = errorMessages.join('|');

			} else if (error.response.body.error.message) {
				errorMessages = error.response.body.error.message;
			}

			throw new Error(`Gmail error response [${error.statusCode}]: ${errorMessages}`);
		}
		throw error;
	}
}

//------------------------------------------------------------------------------------------------------------------------------------------
// This function converts an email object into a MIME encoded email and then converts that string into base64 encoding
// for more info on MIME, https://docs.microsoft.com/en-us/previous-versions/office/developer/exchange-server-2010/aa494197(v%3Dexchg.140)
//------------------------------------------------------------------------------------------------------------------------------------------

export function encodeEmail(email: IEmail) {
	let mimeEmail = '';

	if(email.attachments !== undefined && email.attachments !== []) {
		const attachments = email.attachments.map((attachment) => {
			return [
				"--XXXXboundary text\n",
				"Content-Type:", attachment.type, ";\n",
				"Content-Transfer-Encoding: Base64\n",
				"Content-Disposition: attachment;\n",
					"\tfilename=\"", attachment.name, "\"\n\n",

				attachment.content, "\n\n",

				"--XXXXboundary text\n\n",
			].join('');
		});

		mimeEmail = [
			"To: ", email.to, "\n",
			"Cc: ", email.cc, "\n",
			"Bcc: ", email.bcc, "\n",
			"In-Reply-To: ", email.inReplyTo, "\n",
			"References: ", email.reference, "\n",
			"Subject: ", email.subject, "\n",
			"MIME-Version: 1.0\n",
			"Content-Type: multipart/mixed;\n",
					"\tboundary=\"XXXXboundary text\"\n\n",

			"This is a multipart message in MIME format.\n\n",

			"--XXXXboundary text\n",
			"Content-Type: text/plain\n\n",

			email.body, "\n\n",

			attachments.join(''),

			"--XXXXboundary text--",
		].join('');
	} else {
		mimeEmail = [
			"Content-Type: text/plain; charset=\"UTF-8\"\n",
			"MIME-Version: 1.0\n",
			"Content-Transfer-Encoding: 7bit\n",
			"To: ", email.to, "\n",
			"Cc: ", email.cc, "\n",
			"Bcc: ", email.bcc, "\n",
			"In-Reply-To: ", email.inReplyTo, "\n",
			"References: ", email.reference, "\n",
			"Subject: ", email.subject, "\n\n",
			email.body,
		].join('');
	}


    return new Buffer(mimeEmail).toString("base64").replace(/\+/g, '-').replace(/\//g, '_');
}
