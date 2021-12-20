const crypto = require('crypto');

export function getCurrentTimeStamp(): string {
	const dateTime = Date.now();
	return dateTime.toString();
}

export function connectWithComma(left: string, right: string): string {
	return `${left},${right},`;
}

export function get16TimesLength(input: number): number {
	const scaleNumber = 16;
	const Remainder = input % scaleNumber;
	if (Remainder === 0) {
		return input;
	} else {
		return input - Remainder + scaleNumber;
	}
}

export function padWithSpaceIn16Times(data: string): string {
	const paddingLength = get16TimesLength(data.length);
	return data.padEnd(paddingLength, ' ')
}

export function encryptAES(message: string, aesKey: string): string {
	const iv = '0000000000000000';
	let cipher = crypto.createCipheriv('aes-128-cbc', aesKey, iv);
	cipher.write(message);
	cipher.end();

	const encrypted = cipher.read();
	return encrypted.toString('base64');
}

export function generateTokenWithAESKey(timestamp: string, email: string, aes_key: string): string {
	const data = connectWithComma(timestamp, email);
	const messageToEncrypt = padWithSpaceIn16Times(data);
	const encrypted = encryptAES(messageToEncrypt, aes_key);
	return encodeURIComponent(encrypted);
}
