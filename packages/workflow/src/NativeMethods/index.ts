import { stringMethods } from './String.methods';
import { arrayMethods } from './Array.methods';
import { numberMethods } from './Number.methods';
import { objectMethods } from './Object.Methods';

const NATIVE_METHODS = [stringMethods, arrayMethods, numberMethods, objectMethods];

export { NATIVE_METHODS as NativeMethods };
