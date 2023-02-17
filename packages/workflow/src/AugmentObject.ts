import type { IDataObject } from './Interfaces';
import util from 'util';

export function augmentArray<T>(data: T[]): T[] {
	let newData: unknown[] | undefined = undefined;

	function getData(): unknown[] {
		if (newData === undefined) {
			newData = [...data];
		}
		return newData;
	}

	return new Proxy(data, {
		deleteProperty(target, key) {
			return Reflect.deleteProperty(getData(), key);
		},
		get(target, key, receiver): unknown {
			const value = Reflect.get(newData !== undefined ? newData : target, key, receiver) as unknown;

			if (typeof value === 'object') {
				if (util.types.isProxy(value)) {
					return Reflect.get(newData as unknown[], key);
				}

				newData = getData();

				if (Array.isArray(value)) {
					Reflect.set(newData, key, augmentArray(value));
				} else {
					// eslint-disable-next-line @typescript-eslint/no-use-before-define
					Reflect.set(newData, key, augmentObject(value as IDataObject));
				}

				return Reflect.get(newData, key);
			}

			return value;
		},
		getOwnPropertyDescriptor(target, key) {
			if (newData === undefined) {
				return Reflect.getOwnPropertyDescriptor(target, key);
			}

			if (key === 'length') {
				return Reflect.getOwnPropertyDescriptor(newData, key);
			}
			return { configurable: true, enumerable: true };
		},
		has(target, key) {
			return Reflect.has(newData !== undefined ? newData : target, key);
		},
		ownKeys(target) {
			return Reflect.ownKeys(newData !== undefined ? newData : target);
		},
		set(target, key: string, newValue: unknown) {
			if (typeof newValue === 'object') {
				// Always proxy all objects. Like that we can check in get simply if it
				// is a proxy and it does then not matter if it was already there from the
				// beginning and it got proxied at some point or set later and so theoretically
				// does not have to get proxied
				newValue = new Proxy(newValue as object, {});
			}

			return Reflect.set(getData(), key, newValue);
		},
	});
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
