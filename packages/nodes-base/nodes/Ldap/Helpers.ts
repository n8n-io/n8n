import { Entry } from 'ldapts';
export const BINARY_AD_ATTRIBUTES = ['objectGUID', 'objectSid'];

const resolveEntryBinaryAttributes = (entry: Entry): Entry => {
	Object.entries(entry)
		.filter(([k]) => BINARY_AD_ATTRIBUTES.includes(k))
		.forEach(([k]) => {
			entry[k] = (entry[k] as Buffer).toString('hex');
		});
	return entry;
};

export const resolveBinaryAttributes = (entries: Entry[]): void => {
	entries.forEach((entry) => resolveEntryBinaryAttributes(entry));
};
