import type { INode, NodeParameterValueType } from '../interfaces';

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
