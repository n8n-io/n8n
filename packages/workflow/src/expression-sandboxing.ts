import { type ASTAfterHook, astBuilders as b, astVisit } from '@n8n/tournament';

import { ExpressionError } from './errors';
import { isSafeObjectProperty } from './utils';

export const sanitizerName = '__sanitize';
const sanitizerIdentifier = b.identifier(sanitizerName);

export const PrototypeSanitizer: ASTAfterHook = (ast, dataNode) => {
	astVisit(ast, {
		visitMemberExpression(path) {
			this.traverse(path);
			const node = path.node;
			if (!node.computed) {
				// This is static, so we're safe to error here
				if (node.property.type !== 'Identifier') {
					throw new ExpressionError(
						`Unknown property type ${node.property.type} while sanitising expression`,
					);
				}

				if (!isSafeObjectProperty(node.property.name)) {
					throw new ExpressionError(
						`Cannot access "${node.property.name}" due to security concerns`,
					);
				}
			} else if (node.property.type === 'StringLiteral' || node.property.type === 'Literal') {
				// Check any static strings against our forbidden list
				if (!isSafeObjectProperty(node.property.value as string)) {
					throw new ExpressionError(
						`Cannot access "${node.property.value as string}" due to security concerns`,
					);
				}
			} else if (!node.property.type.endsWith('Literal')) {
				// This isn't a literal value, so we need to wrap it
				path.replace(
					b.memberExpression(
						// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
						node.object as any,
						// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
						b.callExpression(b.memberExpression(dataNode, sanitizerIdentifier), [
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							node.property as any,
						]),
						true,
					),
				);
			}
		},
	});
};

export const sanitizer = (value: unknown): unknown => {
	if (!isSafeObjectProperty(value as string)) {
		throw new ExpressionError(`Cannot access "${value as string}" due to security concerns`);
	}
	return value;
};
