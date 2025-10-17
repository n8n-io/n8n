import type { BinaryHelperFunctions } from 'n8n-workflow';
import type { Readable } from 'stream';

import * as chardet from 'chardet';

const CHINESE_ENCODINGS = ['gb18030', 'gbk', 'gb2312'] as const;
const REPLACEMENT_CHAR = '�';
const HIGH_ASCII_PATTERN = /[\x80-\xFF]{3,}/;
const DEFAULT_ENCODING = 'utf-8';

/**
 * Enhanced encoding detection for better handling of non-UTF-8 content
 * Extracts charset from Content-Type header (e.g., "text/html; charset=utf-8" → "utf-8")
 */
function detectEncoding(contentType?: string): BufferEncoding | undefined {
	if (!contentType) return undefined;

	// Regex breakdown:
	// /charset=([^;,\s]+)/i
	// - charset=           : Match literal "charset=" (case-insensitive due to 'i' flag)
	// - ([^;,\s]+)        : Capture group that matches one or more characters that are NOT:
	//                       ^ = negation, ; = semicolon, , = comma, \s = any whitespace
	// - i                 : Case-insensitive flag (matches "charset=", "CHARSET=", "Charset=", etc.)
	const charsetMatch = contentType.match(/charset=([^;,\s]+)/i);

	if (charsetMatch) {
		// charsetMatch[1] contains the captured group (the charset value)
		// Convert to lowercase and remove any surrounding quotes
		return charsetMatch[1].toLowerCase().replace(/['"]/g, '') as BufferEncoding;
	}

	return undefined;
}

/**
 * Enhanced binary to string conversion for better handling of non-UTF-8 content
 */
export async function binaryToStringWithEncodingDetection(
	body: Buffer | Readable,
	contentType: string,
	helpers: BinaryHelperFunctions,
): Promise<string> {
	const encoding = detectEncoding(contentType);

	if (encoding && encoding !== DEFAULT_ENCODING) {
		return await helpers.binaryToString(body, encoding);
	}

	const decodedString = await helpers.binaryToString(body);

	if (decodedString.includes(REPLACEMENT_CHAR) || HIGH_ASCII_PATTERN.test(decodedString)) {
		if (body instanceof Buffer) {
			const detected = chardet.detect(body)?.toLowerCase() as BufferEncoding;
			if (detected && detected !== DEFAULT_ENCODING) {
				return await helpers.binaryToString(body, detected);
			}
		} else {
			for (const chinese of CHINESE_ENCODINGS) {
				try {
					const reDecoded = await helpers.binaryToString(body, chinese as BufferEncoding);
					if (!reDecoded.includes(REPLACEMENT_CHAR) && reDecoded.length > 0) return reDecoded;
				} catch {}
			}
		}
	}

	return decodedString;
}
