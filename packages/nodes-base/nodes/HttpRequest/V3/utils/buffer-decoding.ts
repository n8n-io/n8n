import type { IExecuteFunctions } from 'n8n-workflow';
import type { Readable } from 'stream';

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
	helpers: IExecuteFunctions['helpers'],
): Promise<string> {
	let bufferedData: Buffer;

	if (body instanceof Buffer) {
		bufferedData = body;
	} else {
		bufferedData = await helpers.binaryToBuffer(body);
	}

	const encoding = detectEncoding(contentType);

	if (encoding && encoding !== DEFAULT_ENCODING) {
		return await helpers.binaryToString(bufferedData, encoding);
	}

	const decodedString = await helpers.binaryToString(bufferedData);

	if (decodedString.includes(REPLACEMENT_CHAR) || HIGH_ASCII_PATTERN.test(decodedString)) {
		const detected = helpers.detectBinaryEncoding(bufferedData).toLowerCase() as BufferEncoding;
		if (detected && detected !== DEFAULT_ENCODING) {
			return await helpers.binaryToString(bufferedData, detected);
		}

		for (const chinese of CHINESE_ENCODINGS) {
			try {
				const reDecoded = await helpers.binaryToString(bufferedData, chinese as BufferEncoding);
				if (!reDecoded.includes(REPLACEMENT_CHAR) && reDecoded.length > 0) return reDecoded;
			} catch {}
		}
	}

	return decodedString;
}
