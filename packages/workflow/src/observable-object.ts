/* eslint-disable @typescript-eslint/no-unsafe-return */

import type { IDataObject, IObservableObject } from './interfaces';

interface IObservableOptions {
	ignoreEmptyOnFirstChild?: boolean;
}

export function create(
	target: IDataObject,
	parent?: IObservableObject,
	option?: IObservableOptions,
	depth?: number,
): IDataObject {
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
	depth = depth || 0;

	// Make all the children of target also observable

	for (const key in target) {
		if (typeof target[key] === 'object' && target[key] !== null) {
			target[key] = create(
				target[key] as IDataObject,
				// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
				(parent || target) as IObservableObject,
				option,
				depth + 1,
			);
		}
	}

	Object.defineProperty(target, '__dataChanged', {
		value: false,
		writable: true,
	});
	return new Proxy(target, {
		deleteProperty(target, name) {
			if (parent === undefined) {
				// If no parent is given mark current data as changed
				(target as IObservableObject).__dataChanged = true;
			} else {
				// If parent is given mark the parent data as changed
				parent.__dataChanged = true;
			}
			return Reflect.deleteProperty(target, name);
		},
		get(target, name, receiver) {
			return Reflect.get(target, name, receiver);
		},
		has(target, key) {
			return Reflect.has(target, key);
		},
		set(target, name, value) {
			if (parent === undefined) {
				// If no parent is given mark current data as changed
				if (
					option !== undefined &&
					option.ignoreEmptyOnFirstChild === true &&
					depth === 0 &&
					target[name.toString()] === undefined &&
					typeof value === 'object' &&
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					Object.keys(value).length === 0
				) {
				} else {
					(target as IObservableObject).__dataChanged = true;
				}
			} else {
				// If parent is given mark the parent data as changed
				parent.__dataChanged = true;
			}
			return Reflect.set(target, name, value);
		},
	});
}
