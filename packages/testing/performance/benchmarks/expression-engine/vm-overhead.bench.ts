/**
 * VM Overhead Micro-Benchmarks
 *
 * Isolates the cost of vm.createContext vs other approaches
 * to understand if the VM approach is fundamentally too slow.
 */
import { bench, describe } from 'vitest';
import * as vm from 'node:vm';

// Test expression
const simpleExpr = '1 + 1';
const propertyAccess = 'data.name';
const arrayMap = 'data.items.map(i => i.value)';

// Test data
const testData = {
	name: 'test',
	items: Array(100)
		.fill(null)
		.map((_, i) => ({ id: i, value: i * 10 })),
};

describe('Context Creation Cost', () => {
	bench('vm.createContext (empty)', () => {
		vm.createContext({});
	});

	bench('vm.createContext (with data)', () => {
		vm.createContext({ data: testData });
	});

	bench('baseline: Object.create', () => {
		Object.create({ data: testData });
	});
});

describe('Execution Cost (Fresh Context)', () => {
	bench('vm.runInContext (simple)', () => {
		const context = vm.createContext({});
		vm.runInContext(simpleExpr, context);
	});

	bench('vm.runInContext (property access)', () => {
		const context = vm.createContext({ data: testData });
		vm.runInContext(propertyAccess, context);
	});

	bench('vm.runInContext (array map)', () => {
		const context = vm.createContext({ data: testData });
		vm.runInContext(arrayMap, context);
	});

	bench('baseline: eval (property access)', () => {
		const data = testData;
		eval(propertyAccess);
	});

	bench('baseline: Function constructor', () => {
		const data = testData;
		new Function('data', `return ${propertyAccess}`)(data);
	});
});

describe('Execution Cost (Reused Context)', () => {
	const context = vm.createContext({ data: testData });

	bench('vm.runInContext (reused, simple)', () => {
		vm.runInContext(simpleExpr, context);
	});

	bench('vm.runInContext (reused, property)', () => {
		vm.runInContext(propertyAccess, context);
	});

	bench('vm.runInContext (reused, array map)', () => {
		vm.runInContext(arrayMap, context);
	});
});

describe('Script Compilation', () => {
	bench('vm.Script (compile)', () => {
		new vm.Script(propertyAccess);
	});

	bench('vm.Script (compile + run)', () => {
		const script = new vm.Script(propertyAccess);
		const context = vm.createContext({ data: testData });
		script.runInContext(context);
	});

	const precompiledScript = new vm.Script(propertyAccess);
	const reusedContext = vm.createContext({ data: testData });

	bench('vm.Script (precompiled + reused context)', () => {
		precompiledScript.runInContext(reusedContext);
	});
});

describe('Data Transfer Overhead', () => {
	const smallData = { value: 42 };
	const largeData = {
		items: Array(10000)
			.fill(null)
			.map((_, i) => ({ id: i, value: i })),
	};

	bench('small data (100 bytes)', () => {
		const context = vm.createContext({ data: smallData });
		vm.runInContext('data.value', context);
	});

	bench('large data (10k items)', () => {
		const context = vm.createContext({ data: largeData });
		vm.runInContext('data.items.length', context);
	});
});
