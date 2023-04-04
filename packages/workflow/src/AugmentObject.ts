import type { IDataObject } from './Interfaces';

const defaultPropertyDescriptor = Object.freeze({ enumerable: true, configurable: true });

const augmentedObjects = new WeakSet<object>();

function augment<T>(value: T): T {
	if (typeof value !== 'object' || value === null || value instanceof RegExp) return value;
	if (value instanceof Date) return new Date(value.valueOf()) as T;
	if (value instanceof Uint8Array) return value.slice() as T;

	// eslint-disable-next-line @typescript-eslint/no-use-before-define
	if (Array.isArray(value)) return augmentArray(value) as T;

	// eslint-disable-next-line @typescript-eslint/no-use-before-define
	return augmentObject(value) as T;
}

export function augmentArray<T>(data: T[]): T[] {
	if (augmentedObjects.has(data)) return data;

	let newData: unknown[] | undefined = undefined;

	function getData(): unknown[] {
		if (newData === undefined) {
			newData = [...data];
		}
		return newData;
	}

	const proxy = new Proxy(data, {
		deleteProperty(target, key: string) {
			return Reflect.deleteProperty(getData(), key);
		},
		get(target, key: string, receiver): unknown {
			const value = Reflect.get(newData !== undefined ? newData : target, key, receiver) as unknown;
			const newValue = augment(value);
			if (newValue !== value) {
				newData = getData();
				Reflect.set(newData, key, newValue);
				return newValue;
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

			return Object.getOwnPropertyDescriptor(data, key) ?? defaultPropertyDescriptor;
		},
		has(target, key) {
			return Reflect.has(newData !== undefined ? newData : target, key);
		},
		ownKeys(target) {
			return Reflect.ownKeys(newData !== undefined ? newData : target);
		},
		set(target, key: string, newValue: unknown) {
			// Always proxy all objects. Like that we can check in get simply if it
			// is a proxy and it does then not matter if it was already there from the
			// beginning and it got proxied at some point or set later and so theoretically
			// does not have to get proxied
			return Reflect.set(getData(), key, augment(newValue));
		},
	});

	augmentedObjects.add(proxy);
	return proxy;
}

export function augmentObject<T extends object>(data: T): T {
	if (augmentedObjects.has(data)) return data;

	const newData = {} as IDataObject;
	const deletedProperties: Array<string | symbol> = [];

	const proxy = new Proxy(data, {
		get(target, key: string, receiver): unknown {
			if (deletedProperties.indexOf(key) !== -1) {
				return undefined;
			}

			if (newData[key] !== undefined) {
				return newData[key];
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const value = Reflect.get(target, key, receiver);
			const newValue = augment(value);
			if (newValue !== value) {
				Object.assign(newData, { [key]: newValue });
				return newValue;
			}

			return value;
		},
		deleteProperty(target, key: string) {
			if (key in newData) {
				delete newData[key];
			}
			if (key in target) {
				deletedProperties.push(key);
			}

			return true;
		},
		set(target, key: string, newValue: unknown) {
			if (newValue === undefined) {
				if (key in newData) {
					delete newData[key];
				}
				if (key in target) {
					deletedProperties.push(key);
				}
				return true;
			}

			newData[key] = newValue as IDataObject;

			const deleteIndex = deletedProperties.indexOf(key);
			if (deleteIndex !== -1) {
				deletedProperties.splice(deleteIndex, 1);
			}

			return true;
		},

		ownKeys(target) {
			const originalKeys = Reflect.ownKeys(target);
			const newKeys = Object.keys(newData);
			return [...new Set([...originalKeys, ...newKeys])].filter(
				(key) => deletedProperties.indexOf(key) === -1,
			);
		},

		getOwnPropertyDescriptor(target, key) {
			return Object.getOwnPropertyDescriptor(data, key) ?? defaultPropertyDescriptor;
		},
	});

	augmentedObjects.add(proxy);
	return proxy;
}
