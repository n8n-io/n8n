import { customAlphabet } from 'nanoid';

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const nanoid = customAlphabet(alphabet, 8);

/**
 * Generates a unique node ID with 'n-' prefix
 */
export function generateNodeId(): string {
	return `n-${nanoid()}`;
}
