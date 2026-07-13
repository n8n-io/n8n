import type { ICredentialDataDecryptedObject, IDataObject } from 'n8n-workflow';
import { jsonParse, UserError } from 'n8n-workflow';

const PLACEHOLDER_MARKER_REGEX = /\{\{\s*([\w.-]+)\s*\}\}/g;

export type TemplatedAuthParts = {
	headers?: IDataObject;
	body?: IDataObject;
	qs?: IDataObject;
};

/**
 * Resolve the `{{placeholder}}` markers of a Templated Custom Auth credential
 * into the request parts its template declares. Markers are substituted per
 * string leaf after parsing (never on the raw JSON text), so a value can never
 * change the template's structure. An unresolved or empty placeholder throws
 * instead of letting a literal marker reach the service.
 */
export function resolveTemplatedAuth(
	credentialData: ICredentialDataDecryptedObject,
): TemplatedAuthParts {
	const template = jsonParse<TemplatedAuthParts>((credentialData.template as string) || '{}', {
		errorMessage: 'Invalid Templated Custom Auth template JSON',
	});
	const values = jsonParse<IDataObject>((credentialData.placeholderValues as string) || '{}', {
		errorMessage: 'Invalid Templated Custom Auth placeholder values JSON',
	});

	const resolve = <T>(part: T): T => {
		if (typeof part === 'string') {
			return part.replace(PLACEHOLDER_MARKER_REGEX, (marker, name: string) => {
				const value = values[name];
				if (value === undefined || value === null || value === '') {
					throw new UserError(
						`No value set for placeholder ${marker} of the Templated Custom Auth credential`,
					);
				}
				if (typeof value === 'object') {
					throw new UserError(
						`The value of placeholder ${marker} of the Templated Custom Auth credential must be a plain value`,
					);
				}
				return String(value);
			}) as T;
		}
		if (Array.isArray(part)) {
			return (part as unknown[]).map((entry) => resolve(entry)) as T;
		}
		if (typeof part === 'object' && part !== null) {
			// Object.fromEntries defines own properties only, so template keys such
			// as `__proto__` cannot reach the prototype chain.
			return Object.fromEntries(
				Object.entries(part).map(([key, entry]) => [key, resolve(entry)]),
			) as T;
		}
		return part;
	};

	return resolve(template);
}
