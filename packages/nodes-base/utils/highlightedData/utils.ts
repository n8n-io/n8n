import snakeCase from 'lodash/snakeCase';

export function getHighlightedInputKey(nodeName: string): string {
	return `input_${snakeCase(nodeName)}`;
}

export function getHighlightedResponseKey(nodeName: string): string {
	return `response_${snakeCase(nodeName)}`;
}
