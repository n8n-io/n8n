import {
	createHash
} from 'crypto';

export function hash(value: string): string {
	const hashedValue = createHash('SHA256').update(value).digest('hex');
	return hashedValue;
}
