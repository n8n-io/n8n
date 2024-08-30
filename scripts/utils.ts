import {
	ArrayLiteralExpression,
	Block,
	// ClassDeclaration,
	ImportSpecifier,
	ObjectLiteralExpression,
	// Project,
	PropertyAccessExpression,
	PropertyAssignment,
	// ScriptTarget,
	// SourceFile,
	SpreadAssignment,
	SpreadElement,
	SyntaxKind,
	Node,
	Expression,
	Identifier,
	VariableDeclaration,
	ObjectLiteralElementLike,
	ClassDeclaration,
} from 'ts-morph';

const DESCRIPTION_KEY = 'description';

const importResolver = (specifier: ImportSpecifier) => {
	const sourceFile = specifier.getSourceFile();
	let returnValue;

	sourceFile.forEachChild((child) => {
		if (child.getKind() === SyntaxKind.ImportDeclaration) {
			const declaration = child.asKindOrThrow(SyntaxKind.ImportDeclaration);
			const specifierInImports = declaration
				.getNamedImports()
				.find((entry) => entry.getName() === specifier.getName());

			if (specifierInImports) {
				const exportSymbols = declaration.getModuleSpecifierSourceFile()?.getSymbol()?.getExports();

				if (exportSymbols) {
					for (const symbol of exportSymbols) {
						if (symbol.getName() === specifier.getName()) {
							const value = symbol.getValueDeclaration();
							if (value && value.getKind() === SyntaxKind.VariableDeclaration) {
								const variable = value
									.asKindOrThrow(SyntaxKind.VariableDeclaration)
									.getInitializer();
								returnValue = variable;
							}
						}
					}
				}
			}
		}
	});

	return returnValue;
};

const spreadAssignmentResolver = (spreadAssignment: SpreadAssignment) => {
	const spreadExpression = spreadAssignment.getExpression();
	return resolve(spreadExpression);
};

const arrayResolver = (expression: ArrayLiteralExpression): ObjectLiteralExpression[] => {
	const returnData = expression
		.asKind(SyntaxKind.ArrayLiteralExpression)!
		.getElements()
		.flatMap((el) => resolve(el) || []);

	return returnData;
};

const identifierResolver = (identifier: Identifier) => {
	const declaration = identifier.getSourceFile().getVariableDeclaration(identifier.getText());
	return resolve(declaration);
};

const variableResolver = (declaration: VariableDeclaration) => {
	const initializer = declaration.getInitializer();
	return resolve(initializer);
};

const spreadElementResolver = (spreadElement: SpreadElement) => {
	const expression = spreadElement.getExpression();
	return resolve(expression);
};

const propertyAccessResolver = (propertyAccess: PropertyAccessExpression) => {
	const declaration = propertyAccess.getSymbol()?.getDeclarations()?.[0];
	return resolve(declaration);
};

const propertyAssignmentResolver = (propertyAssignment: PropertyAssignment) => {
	const initializer = propertyAssignment.getInitializer();
	return resolve(initializer);
};

export function resolve(
	node: Node | Expression | undefined,
): ObjectLiteralExpression | ObjectLiteralExpression[] | undefined {
	if (!node) return undefined;

	if (node.isKind(SyntaxKind.ObjectLiteralExpression)) return node;

	if (node.isKind(SyntaxKind.ArrayLiteralExpression)) {
		return arrayResolver(node);
	}
	if (node.isKind(SyntaxKind.ImportSpecifier)) {
		return resolve(importResolver(node));
	}
	if (node.isKind(SyntaxKind.SpreadAssignment)) {
		return spreadAssignmentResolver(node);
	}
	if (node.isKind(SyntaxKind.VariableDeclaration)) {
		return variableResolver(node);
	}
	if (node.isKind(SyntaxKind.Identifier)) {
		return identifierResolver(node);
	}
	if (node.isKind(SyntaxKind.SpreadElement)) {
		return spreadElementResolver(node);
	}
	if (node.isKind(SyntaxKind.PropertyAccessExpression)) {
		return propertyAccessResolver(node);
	}
	if (node.isKind(SyntaxKind.PropertyAssignment)) {
		return propertyAssignmentResolver(node);
	}

	return undefined;
}

export function convert(literal: ObjectLiteralExpression) {
	let returnData: { [key: string]: any } = {};
	try {
		const allProperties = literal.getProperties();

		allProperties.forEach((property: ObjectLiteralElementLike) => {
			if (property.isKind(SyntaxKind.PropertyAssignment)) {
				const key = property.getName();
				const valueNode = property.getInitializer();
				const value = evaluate(valueNode);
				returnData[key] = value;
			} else {
				const node = resolve(property);
				if (Array.isArray(node)) {
					returnData = { ...returnData, ...node.map((node) => convert(node)) };
				} else if (node) {
					returnData = { ...returnData, ...convert(node) };
				}
			}
		});
	} catch (error) {
		console.log(error);
	}

	return returnData;
}

function evaluate(node: Node | undefined): any {
	if (!node) return undefined;

	if (node.isKind(SyntaxKind.StringLiteral)) {
		return node.getLiteralValue();
	}
	if (node.isKind(SyntaxKind.NumericLiteral)) {
		return Number(node.getText());
	}
	if (node.isKind(SyntaxKind.TrueKeyword)) {
		return true;
	}
	if (node.isKind(SyntaxKind.FalseKeyword)) {
		return false;
	}
	if (node.isKind(SyntaxKind.ObjectLiteralExpression)) {
		return convert(node);
	}
	if (node.isKind(SyntaxKind.ArrayLiteralExpression)) {
		return node.getElements().map((element: any) => evaluate(element));
	}

	return undefined;
}

export const getDescriptionProperty = (declaration: ClassDeclaration) => {
	const prop = declaration.getProperty(DESCRIPTION_KEY);

	let description = prop?.getInitializer();

	if (description?.isKind(SyntaxKind.Identifier)) {
		const variableDeclaration = description.findReferencesAsNodes()[0]?.getParent();

		return resolve(variableDeclaration);
	}

	const constructor = declaration.getConstructors()[0];

	if (!constructor) {
		throw new Error('Could not get description, no constructor found');
	}

	const body = constructor.getBody() as Block | undefined;
	if (!body) {
		throw new Error('Could not get description, no constructor body');
	}

	const statements = body.getStatements();
	for (const statement of statements) {
		if (statement.isKind(SyntaxKind.ExpressionStatement)) {
			const expression = statement.getExpression();
			if (expression.isKind(SyntaxKind.BinaryExpression)) {
				const value = expression.getRight();

				if (expression.getLeft().getText() === 'this.description') {
					return value;
				}
			}
		}
	}

	throw new Error('Could not get description');
};
