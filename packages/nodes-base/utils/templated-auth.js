import isPlainObject from 'lodash/isPlainObject';
import { jsonParse, UserError } from 'n8n-workflow';
const PLACEHOLDER_MARKER_REGEX = /\{\{\s*([\w.-]+)\s*\}\}/g;
/** A resolved string that must be dropped from the output (empty optional). */
const OMIT = Symbol('omit');
function isEmptyPlaceholderValue(value) {
    return value === undefined || value === null || value === '';
}
function isPlainDataObject(value) {
    return isPlainObject(value);
}
function assertTemplatedAuthParts(value) {
    if (!isPlainDataObject(value)) {
        throw new UserError('Simplified Custom Auth template must be a JSON object');
    }
    for (const partName of ['headers', 'body', 'qs']) {
        const part = value[partName];
        if (part !== undefined && !isPlainDataObject(part)) {
            throw new UserError(`Simplified Custom Auth template ${partName} must be a JSON object`);
        }
    }
}
/** Marker names whose placeholder def declares `optional: true`. */
function optionalMarkerNames(credentialData) {
    const parsed = jsonParse(credentialData.placeholderDefs || '[]', {
        fallbackValue: [],
    });
    if (!Array.isArray(parsed))
        return new Set();
    const defs = parsed;
    const names = new Set();
    for (const def of defs) {
        if (typeof def === 'object' &&
            def !== null &&
            'name' in def &&
            typeof def.name === 'string' &&
            'optional' in def &&
            def.optional === true) {
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
export function resolveTemplatedAuth(credentialData) {
    const template = jsonParse(credentialData.template || '{}', {
        errorMessage: 'Invalid Simplified Custom Auth template JSON',
    });
    assertTemplatedAuthParts(template);
    const values = jsonParse(credentialData.placeholderValues || '{}', {
        errorMessage: 'Invalid Simplified Custom Auth placeholder values JSON',
    });
    if (!isPlainDataObject(values)) {
        throw new UserError('Simplified Custom Auth placeholder values must be a JSON object');
    }
    const placeholderValues = new Map(Object.entries(values));
    const optionalMarkers = optionalMarkerNames(credentialData);
    const resolve = (part) => {
        if (typeof part === 'string') {
            const shouldOmit = [...part.matchAll(PLACEHOLDER_MARKER_REGEX)].some(([, name]) => isEmptyPlaceholderValue(placeholderValues.get(name)) && optionalMarkers.has(name));
            if (shouldOmit)
                return OMIT;
            const resolved = part.replace(PLACEHOLDER_MARKER_REGEX, (marker, name) => {
                const value = placeholderValues.get(name);
                if (isEmptyPlaceholderValue(value)) {
                    throw new UserError(`No value set for placeholder ${marker} of the Simplified Custom Auth credential`);
                }
                if (typeof value === 'object') {
                    throw new UserError(`The value of placeholder ${marker} of the Simplified Custom Auth credential must be a plain value`);
                }
                return String(value);
            });
            return resolved;
        }
        if (Array.isArray(part)) {
            return part
                .map((entry) => resolve(entry))
                .filter((entry) => entry !== OMIT);
        }
        if (typeof part === 'object' && part !== null) {
            // Object.fromEntries defines own properties only, so template keys such
            // as `__proto__` cannot reach the prototype chain.
            return Object.fromEntries(Object.entries(part)
                .map(([key, entry]) => [key, resolve(entry)])
                .filter(([, entry]) => entry !== OMIT));
        }
        return part;
    };
    const resolved = resolve(template);
    // The top level is always an object, so it can never resolve to OMIT.
    return resolved === OMIT ? {} : resolved;
}
/** Resolve and merge a Templated Custom Auth credential into request options. */
export function applyTemplatedAuth(credentialData, requestOptions) {
    const templatedAuth = resolveTemplatedAuth(credentialData);
    if (templatedAuth.headers) {
        requestOptions.headers = { ...requestOptions.headers, ...templatedAuth.headers };
    }
    if (templatedAuth.body) {
        const existingBody = requestOptions.body;
        if (existingBody !== undefined && !isPlainDataObject(existingBody)) {
            throw new UserError('Simplified Custom Auth body templates cannot be applied to non-object request bodies');
        }
        requestOptions.body = { ...existingBody, ...templatedAuth.body };
    }
    if (templatedAuth.qs) {
        requestOptions.qs = { ...requestOptions.qs, ...templatedAuth.qs };
    }
    return templatedAuth;
}
//# sourceMappingURL=templated-auth.js.map