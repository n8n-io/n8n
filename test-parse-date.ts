import { parseDate } from './packages/nodes-base/nodes/DateTime/V2/GenericFunctions'; // adjust the relative path

function testCase(label: string, input: any, options: any = {}): void {
	try {
		const result = parseDate.call({ getNode: () => ({ name: 'test' }) } as any, input, options);
		console.log(`✅ ${label}`);
		console.log(`   Input: ${JSON.stringify(input)}  Options: ${JSON.stringify(options)}`);
		console.log(`   ISO: ${result.toISO()}`);
		console.log(`   yyyy/MM/dd: ${result.toFormat('yyyy/MM/dd')}`);
		console.log(`   Zone: ${result.zoneName}`);
	} catch (err: any) {
		console.log(`❌ ${label}`);
		console.log(`   ERROR: ${err.message}`);
	}
}

console.log('--- Testing parseDate bug case ---\n');

testCase("YYYY-MM-DD (no timezone, default)", "2025-09-26");

testCase("YYYY-MM-DD with Asia/Kolkata", "2025-09-26", { timezone: "Asia/Kolkata" });

testCase("YYYY-MM-DD with UTC", "2025-09-26", { timezone: "UTC" });
