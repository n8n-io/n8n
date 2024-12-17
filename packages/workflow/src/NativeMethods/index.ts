import { arrayMethods } from './Array.methods';
import { booleanMethods } from './Boolean.methods';
import { numberMethods } from './Number.methods';
import { objectMethods } from './Object.Methods';
import { stringMethods } from './String.methods';
import type { NativeDoc } from '../Extensions/Extensions';

const NATIVE_METHODS: NativeDoc[] = [
	stringMethods,
	arrayMethods,
	numberMethods,
	objectMethods,
	booleanMethods,
];

export { NATIVE_METHODS as NativeMethods };
