/**
 * Transforms parsed PostalMime output into the same shape as mailparser
 * so that existing tests and consumers see unchanged input/output.
 */
import type { IDataObject } from 'n8n-workflow';

type AddressValue = { name: string; address: string };

/** Escape for HTML content (mailparser-style address/html output). */
function escapeForHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Format address value array as mailparser-style text: "Name" <addr> or just addr. */
function formatAddressText(value: AddressValue[]): string {
	if (!value?.length) return '';
	return value
		.map((v) => (v.name ? `"${v.name}" <${v.address}>` : v.address))
		.filter(Boolean)
		.join(', ');
}

/** Format address value array as mailparser-style HTML with mp_address_* classes. */
function formatAddressHtml(value: AddressValue[]): string {
	if (!value?.length) return '';
	return value
		.map((v) => {
			const escapedAddr = escapeForHtml(v.address);
			const link = `<a href="mailto:${escapedAddr}" class="mp_address_email">${escapedAddr}</a>`;
			if (v.name) {
				const escapedName = escapeForHtml(v.name);
				return `<span class="mp_address_group"><span class="mp_address_name">${escapedName}</span> &lt;${link}&gt;</span>`;
			}
			return `<span class="mp_address_group">${link}</span>`;
		})
		.join(', ');
}

/** Plain text to simple HTML (mailparser textAsHtml). */
function textToHtml(text: string | undefined): string | undefined {
	if (text === undefined || text === null) return undefined;
	const trimmed = String(text).trim();
	if (!trimmed) return undefined;
	return `<p>${escapeForHtml(trimmed).replace(/\n/g, '<br/>')}</p>`;
}

/** Normalize body newlines to single trailing \\n like mailparser. */
function normalizeBodyNewlines(s: string | undefined): string | undefined {
	if (s === undefined || s === null) return undefined;
	const t = String(s).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	const trimmed = t.replace(/\n+$/, '');
	return trimmed + '\n';
}

/**
 * Mailparser represented invalid UTF-8 in headers as the Latin-1 mojibake
 * "ï¿½" (U+00EF U+00BF U+00BD). PostalMime uses U+FFFD. Normalize so tests
 * and consumers that expect the literal string still match.
 */
function headerValueToMailparserReplacement(s: string): string {
	return s.replace(/\uFFFD/g, '\u00EF\u00BF\u00BD');
}

/**
 * Detect garbage parse (e.g. invalid raw like "test email content") and
 * return mailparser-style output: headers with "" key, html: false.
 */
function isGarbageParse(json: IDataObject): boolean {
	const from = json.from as { value?: unknown[] } | undefined;
	const to = json.to as { value?: unknown[] } | undefined;
	const headers = json.headers as IDataObject | undefined;
	if (!headers || typeof headers !== 'object') return false;
	const keys = Object.keys(headers);
	return (
		Array.isArray(from?.value) &&
		from.value.length === 0 &&
		Array.isArray(to?.value) &&
		to.value.length === 0 &&
		keys.length === 1 &&
		keys[0] !== '' &&
		!keys[0].match(/^[a-z-]+$/) // standard header names are lowercase-with-dashes
	);
}

/**
 * Convert the json built from PostalMime into mailparser-compatible shape.
 * Keeps GenericFunctions free of mailparser-specific formatting.
 */
export function toMailparserShape(json: IDataObject): IDataObject {
	// Garbage parse (invalid raw): mailparser used empty key and html: false
	if (isGarbageParse(json)) {
		const headers = json.headers as IDataObject;
		const singleKey = Object.keys(headers)[0];
		const rawValue = headers[singleKey];
		const value =
			typeof rawValue === 'string' ? headerValueToMailparserReplacement(rawValue) : rawValue;
		const out: IDataObject = { headers: { '': value }, html: false };
		for (const key of Object.keys(out)) {
			if (out[key] === undefined) delete out[key];
		}
		return out;
	}

	const fromValue = (json.from as { value?: AddressValue[] } | undefined)?.value ?? [];
	const toValue = (json.to as { value?: AddressValue[] } | undefined)?.value ?? [];

	const out: IDataObject = { ...json };
	out.from = {
		value: fromValue,
		text: formatAddressText(fromValue),
		html: formatAddressHtml(fromValue),
	};
	out.to = {
		value: toValue,
		text: formatAddressText(toValue),
		html: formatAddressHtml(toValue),
	};
	const ccValue = (json.cc as { value?: AddressValue[] } | undefined)?.value ?? [];
	const bccValue = (json.bcc as { value?: AddressValue[] } | undefined)?.value ?? [];
	const replyToValue = (json.replyTo as { value?: AddressValue[] } | undefined)?.value ?? [];
	if (ccValue.length) {
		out.cc = {
			value: ccValue,
			text: formatAddressText(ccValue),
			html: formatAddressHtml(ccValue),
		};
	}
	if (bccValue.length) {
		out.bcc = {
			value: bccValue,
			text: formatAddressText(bccValue),
			html: formatAddressHtml(bccValue),
		};
	}
	if (replyToValue.length) {
		out.replyTo = {
			value: replyToValue,
			text: formatAddressText(replyToValue),
			html: formatAddressHtml(replyToValue),
		};
	}
	const senderValue = (json.sender as { value?: AddressValue[] } | undefined)?.value ?? [];
	if (senderValue.length) {
		out.sender = {
			value: senderValue,
			text: formatAddressText(senderValue),
			html: formatAddressHtml(senderValue),
		};
	}

	// Normalize header values: PostalMime uses U+FFFD, mailparser used "ï¿½"
	if (out.headers && typeof out.headers === 'object') {
		const h = out.headers as IDataObject;
		for (const k of Object.keys(h)) {
			const v = h[k];
			if (typeof v === 'string') h[k] = headerValueToMailparserReplacement(v);
		}
	}

	const text = json.text as string | undefined;
	const html = json.html as string | undefined;
	out.text = normalizeBodyNewlines(text);
	out.html = normalizeBodyNewlines(html);
	const textAsHtml = textToHtml(text);
	if (textAsHtml !== undefined) out.textAsHtml = textAsHtml;

	for (const key of Object.keys(out)) {
		if (out[key] === undefined) delete out[key];
	}
	return out;
}
