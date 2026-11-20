import { formatPemBlock } from '@n8n/utils/format-pem-block';
import { UserError } from '@n8n/errors';

/**
 * `formatPemBlock` is best-effort and returns anything it does not recognise
 * unchanged, so a truncated or mistyped paste reaches the TLS layer and fails
 * there as an opaque handshake error. This refuses it at config time instead.
 */
export function formatAndValidatePem(
	value: string,
	subject: string,
	fieldName: string,
	label: 'CERTIFICATE' | 'PRIVATE KEY' = 'CERTIFICATE',
): string {
	const formatted = formatPemBlock(value);

	// The label has to match too: a private key pasted into a CA field passes a
	// label-agnostic check, and Node then builds an empty trust store from it.
	const pattern =
		label === 'CERTIFICATE'
			? /-----BEGIN (?:TRUSTED )?CERTIFICATE-----[\s\S]+-----END (?:TRUSTED )?CERTIFICATE-----/
			: /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----[\s\S]+-----END (?:[A-Z0-9]+ )?PRIVATE KEY-----/;

	if (!pattern.test(formatted)) {
		throw new UserError(`The ${subject} ${fieldName} is not a valid PEM ${label.toLowerCase()}`, {
			level: 'warning',
			description: `Paste the full PEM, including the "-----BEGIN ${label}-----" and "-----END ${label}-----" lines.`,
		});
	}

	return formatted;
}
