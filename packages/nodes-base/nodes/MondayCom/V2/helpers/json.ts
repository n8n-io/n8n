import type { IDataObject } from 'n8n-workflow';

export function safeJsonParse(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

/** True for plain objects only — rejects null and arrays (`typeof [] === 'object'`). */
export function isPlainJsonObject(value: unknown): value is IDataObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
