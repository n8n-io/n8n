import type { IDataObject } from './Interfaces';

export function augmentArray<T>(data: T[]): T[] {
	return new Proxy(data, {});
}

export function augmentObject<T extends object>(data: T): T {
	const newData = {} as IDataObject;
	const deletedProperies: Array<string | symbol> = [];

	return new Proxy(data, {
		get(target, key, receiver): unknown {
			if (deletedProperies.indexOf(key) !== -1) {
				return undefined;
			}

			if (newData[key as string]) {
				return newData[key as string];
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const value = Reflect.get(target, key, receiver);

			if (typeof value === 'object') {
				if (Array.isArray(value)) {
					newData[key as string] = augmentArray(value);
				} else {
					newData[key as string] = augmentObject(value as IDataObject);
				}

				return newData[key as string];
			}

			return value as string;
		},
		deleteProperty(target, key) {
			if (key in newData) {
				delete newData[key as string];
			}
			if (key in target) {
				deletedProperies.push(key);
			}

			return true;
		},
		set(target, key, newValue: unknown) {
			if (newValue === undefined) {
				if (key in newData) {
					delete newData[key as string];
				}
				if (key in target) {
					deletedProperies.push(key);
				}
				return true;
			}

			newData[key as string] = newValue as IDataObject;

			const deleteIndex = deletedProperies.indexOf(key);
			if (deleteIndex !== -1) {
				deletedProperies.splice(deleteIndex, 1);
			}

			return true;
		},
		ownKeys(target) {
			return [...new Set([...Reflect.ownKeys(target), ...Object.keys(newData)])].filter(
				(key) => deletedProperies.indexOf(key) === -1,
			);
		},

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		getOwnPropertyDescriptor(k) {
			return {
				enumerable: true,
				configurable: true,
			};
		},
	});
}
