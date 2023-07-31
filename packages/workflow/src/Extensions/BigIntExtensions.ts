// workaround to keep typescript happy
// implementation is in packages/workflow/src/utils.ts
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface BigInt {
	toJSON(): string;
}
