import { stringMethods } from './String.methods';
import { arrayMethods } from './Array.methods';
import { numberMethods } from './Number.methods';
import { objectMethods } from './Object.Methods';
import type { NativeDoc } from '@/Extensions/Extensions';

const NATIVE_METHODS: NativeDoc[] = [stringMethods, arrayMethods, numberMethods, objectMethods];

export { NATIVE_METHODS as NativeMethods };
