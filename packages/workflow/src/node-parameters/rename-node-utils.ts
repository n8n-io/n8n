import type { INode, NodeParameterValueType } from '../interfaces';
import { applyAccessPatterns } from '../node-reference-parser-utils';

/**
 * Type guard to check if a value is a valid NodeParameterValueType
 */
function isNodeParameterValueType(value: unknown): value is NodeParameterValueType {
	if (value === null || value === undefined) return true;
	const type = typeof value;
	if (type === 'string' || type === 'number' || type === 'boolean') return true;
	if (Array.isArray(value)) return value.every(isNodeParameterValueType);
	if (type === 'object') return true;
	return false;
}

/**
 * Recursively update node name references in parameter values
 */
export function renameNodeInParameterValue(
	parameterValue: NodeParameterValueType,
	currentName: string,
	newName: string,
	{ hasRenamableContent } = { hasRenamableContent: false },
): NodeParameterValueType {
	if (typeof parameterValue !== 'object') {
		if (
			typeof parameterValue === 'string' &&
			(parameterValue.charAt(0) === '=' || hasRenamableContent)
		) {
			return applyAccessPatterns(parameterValue, currentName, newName);
		}
		return parameterValue;
	}

	if (parameterValue === null) {
		return parameterValue;
	}

	if (Array.isArray(parameterValue)) {
		const mappedArray = parameterValue.map((item) => {
			if (!isNodeParameterValueType(item)) return item;
			return renameNodeInParameterValue(item, currentName, newName, {
				hasRenamableContent,
			});
		});
		return mappedArray as NodeParameterValueType;
	}

	const returnData: Record<string, NodeParameterValueType> = {};
	for (const parameterName of Object.keys(parameterValue)) {
		const value = parameterValue[parameterName as keyof typeof parameterValue];
		if (isNodeParameterValueType(value)) {
			returnData[parameterName] = renameNodeInParameterValue(value, currentName, newName, {
				hasRenamableContent,
			});
		} else {
			returnData[parameterName] = value as NodeParameterValueType;
		}
	}
	return returnData;
}

export function renameFormFields(
	node: INode,
	renameField: (v: NodeParameterValueType) => NodeParameterValueType,
): void {
	const formFields = node.parameters?.formFields;

	const values =
		formFields &&
		typeof formFields === 'object' &&
		'values' in formFields &&
		typeof formFields.values === 'object' &&
		// TypeScript thinks this is `Array.values` and gets very confused here
		// eslint-disable-next-line @typescript-eslint/unbound-method
		Array.isArray(formFields.values)
			? // eslint-disable-next-line @typescript-eslint/unbound-method
				(formFields.values ?? [])
			: [];

	for (const formFieldValue of values) {
		if (!formFieldValue || typeof formFieldValue !== 'object') continue;
		if ('fieldType' in formFieldValue && formFieldValue.fieldType === 'html') {
			if ('html' in formFieldValue) {
				formFieldValue.html = renameField(formFieldValue.html);
			}
		}
	}
}
