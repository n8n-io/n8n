import { formatPemBlock } from '@n8n/utils/format-pem-block';
import { UserError } from '@n8n/errors';

/**
 * `formatPemBlock` is best-effort and returns anything it does not recognise
 * unchanged, so a truncated or mistyped paste reaches the TLS layer and fails
 * there as an opaque handshake error. This refuses it at config time instead.
 */
export function formatAndValidatePem(value: string, subject: string, fieldName: string): string {
	const formatted = formatPemBlock(value);

	if (!/-----BEGIN ([A-Z0-9 ]+)-----[\s\S]+-----END \1-----/.test(formatted)) {
		throw new UserError(`The ${subject} ${fieldName} is not a valid PEM block`, {
			level: 'warning',
			description:
				'Paste the full PEM, including the "-----BEGIN ...-----" and "-----END ...-----" lines.',
		});
	}

	return formatted;
}
