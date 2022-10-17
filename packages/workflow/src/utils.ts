/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
export const deepCopy = <T>(obj: T): T => {
	let newObject: any;
	let iterator: any;
	if (obj instanceof Date) {
		return new Date(obj.getTime()) as T;
	}
	// if not array or object or is null return self
	if (typeof obj !== 'object' || obj === null) {
		return obj;
	}
	// handle case: array
	if (Array.isArray(obj)) {
		const length = obj.length;
		newObject = [];
		for (iterator = 0; iterator < length; iterator++) {
			newObject[iterator] = deepCopy(obj[iterator]);
		}
		return newObject;
	}
	// handle case: object
	newObject = {};
	for (iterator in obj) {
		if (obj.hasOwnProperty(iterator)) {
			newObject[iterator] = deepCopy((obj as any)[iterator]);
		}
	}
	return newObject;
};
// eslint-enable
