import isPlainObject from 'lodash/isPlainObject';
import type { ICredentialDataDecryptedObject, IDataObject } from 'n8n-workflow';
import { jsonParse, UserError } from 'n8n-workflow';

const PLACEHOLDER_MARKER_REGEX = /\{\{\s*([\w.-]+)\s*\}\}/g;

export type TemplatedAuthParts = {
	headers?: IDataObject;
	body?: IDataObject;
	qs?: IDataObject;
};

type TemplatedAuthRequestOptions = {
	headers?: IDataObject;
	body?: unknown;
	qs?: IDataObject;
};

/** A resolved string that must be dropped from the output (empty optional). */
const OMIT = Symbol('omit');

function isEmptyPlaceholderValue(value: unknown): value is null | undefined | '' {
	return value === undefined || value === null || value === '';
}

function isPlainDataObject(value: unknown): value is IDataObject {
	return isPlainObject(value);
}

function assertTemplatedAuthParts(value: unknown): asserts value is TemplatedAuthParts {
	if (!isPlainDataObject(value)) {
		throw new UserError('Simplified Custom Auth template must be a JSON object');
	}

	for (const partName of ['headers', 'body', 'qs'] satisfies Array<keyof TemplatedAuthParts>) {
		const part = value[partName];
		if (part !== undefined && !isPlainDataObject(part)) {
			throw new UserError(`Simplified Custom Auth template ${partName} must be a JSON object`);
		}
	}
}

/** Marker names whose placeholder def declares `optional: true`. */
function optionalMarkerNames(credentialData: ICredentialDataDecryptedObject): Set<string> {
	const parsed = jsonParse<unknown>((credentialData.placeholderDefs as string) || '[]', {
		fallbackValue: [],
	});
	if (!Array.isArray(parsed)) return new Set();
	const defs: unknown[] = parsed;
	const names = new Set<string>();
	for (const def of defs) {
		if (
			typeof def === 'object' &&
			def !== null &&
			'name' in def &&
			typeof def.name === 'string' &&
			'optional' in def &&
			def.optional === true
		) {
			names.add(def.name);
		}
	}
	return names;
}

/**
 * Resolve the `{{placeholder}}` markers of a Templated Custom Auth credential
 * into the request parts its template declares. Markers are substituted per
 * string leaf after parsing (never on the raw JSON text), so a value can never
 * change the template's structure. An unresolved or empty placeholder throws
 * instead of letting a literal marker reach the service — unless its def marks
 * it optional, in which case the containing template entry is omitted.
 */
export function resolveTemplatedAuth(
	credentialData: ICredentialDataDecryptedObject,
): TemplatedAuthParts {
	const template = jsonParse<unknown>((credentialData.template as string) || '{}', {
		errorMessage: 'Invalid Simplified Custom Auth template JSON',
	});
	assertTemplatedAuthParts(template);

	const values = jsonParse<unknown>((credentialData.placeholderValues as string) || '{}', {
		errorMessage: 'Invalid Simplified Custom Auth placeholder values JSON',
	});
	if (!isPlainDataObject(values)) {
		throw new UserError('Simplified Custom Auth placeholder values must be a JSON object');
	}
	const placeholderValues = new Map(Object.entries(values));
	const optionalMarkers = optionalMarkerNames(credentialData);

	const resolve = <T>(part: T): T | typeof OMIT => {
		if (typeof part === 'string') {
			const shouldOmit = [...part.matchAll(PLACEHOLDER_MARKER_REGEX)].some(
				([, name]) =>
					isEmptyPlaceholderValue(placeholderValues.get(name)) && optionalMarkers.has(name),
			);
			if (shouldOmit) return OMIT;

			const resolved = part.replace(PLACEHOLDER_MARKER_REGEX, (marker, name: string) => {
				const value = placeholderValues.get(name);
				if (isEmptyPlaceholderValue(value)) {
					throw new UserError(
						`No value set for placeholder ${marker} of the Simplified Custom Auth credential`,
					);
				}
				if (typeof value === 'object') {
					throw new UserError(
						`The value of placeholder ${marker} of the Simplified Custom Auth credential must be a plain value`,
					);
				}
				return String(value);
			});
			return resolved as T;
		}
		if (Array.isArray(part)) {
			return (part as unknown[])
				.map((entry) => resolve(entry))
				.filter((entry) => entry !== OMIT) as T;
		}
		if (typeof part === 'object' && part !== null) {
			// Object.fromEntries defines own properties only, so template keys such
			// as `__proto__` cannot reach the prototype chain.
			return Object.fromEntries(
				Object.entries(part)
					.map(([key, entry]) => [key, resolve(entry)] as const)
					.filter(([, entry]) => entry !== OMIT),
			) as T;
		}
		return part;
	};

	const resolved = resolve(template);
	// The top level is always an object, so it can never resolve to OMIT.
	return resolved === OMIT ? {} : resolved;
}

/** Resolve and merge a Templated Custom Auth credential into request options. */
export function applyTemplatedAuth(
	credentialData: ICredentialDataDecryptedObject,
	requestOptions: TemplatedAuthRequestOptions,
): TemplatedAuthParts {
	const templatedAuth = resolveTemplatedAuth(credentialData);

	if (templatedAuth.headers) {
		requestOptions.headers = { ...requestOptions.headers, ...templatedAuth.headers };
	}
	if (templatedAuth.body) {
		const existingBody = requestOptions.body;
		if (existingBody !== undefined && !isPlainDataObject(existingBody)) {
			throw new UserError(
				'Simplified Custom Auth body templates cannot be applied to non-object request bodies',
			);
		}
		requestOptions.body = { ...existingBody, ...templatedAuth.body };
	}
	if (templatedAuth.qs) {
		requestOptions.qs = { ...requestOptions.qs, ...templatedAuth.qs };
	}

	return templatedAuth;
}
