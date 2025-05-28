import { arrayMethods } from './array.methods';
import { booleanMethods } from './boolean.methods';
import { numberMethods } from './number.methods';
import { objectMethods } from './object.methods';
import { stringMethods } from './string.methods';
import type { NativeDoc } from '../extensions/extensions';

const NATIVE_METHODS: NativeDoc[] = [
	stringMethods,
	arrayMethods,
	numberMethods,
	objectMethods,
	booleanMethods,
];

export { NATIVE_METHODS as NativeMethods };
