import { Node } from 'ts-morph';
import type { ClassDeclaration, Decorator, MethodDeclaration } from 'ts-morph';

type Decoratable = ClassDeclaration | MethodDeclaration;

export function getDecoratorByName(
	node: Decoratable,
	names: Iterable<string>,
): Decorator | undefined {
	const set = names instanceof Set ? names : new Set(names);
	return node.getDecorators().find((d) => set.has(d.getName()));
}

export function classHasDecorator(cls: ClassDeclaration, names: Iterable<string>): boolean {
	return getDecoratorByName(cls, names) !== undefined;
}

/** Read a boolean flag from a decorator's options-object arg, e.g. `@Get('/x', { skipAuth: true })`. */
export function getDecoratorObjectFlag(deco: Decorator, index: number, flag: string): boolean {
	const arg = deco.getArguments()[index];
	if (!arg || !Node.isObjectLiteralExpression(arg)) return false;
	const prop = arg.getProperty(flag);
	return !!prop && Node.isPropertyAssignment(prop) && prop.getInitializer()?.getText() === 'true';
}
