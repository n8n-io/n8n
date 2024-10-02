import {
	ArrayLiteralExpression,
	Block,
	ClassDeclaration,
	ImportSpecifier,
	ObjectLiteralExpression,
	Project,
	PropertyAccessExpression,
	PropertyAssignment,
	ScriptTarget,
	SourceFile,
	SpreadAssignment,
	SpreadElement,
	SyntaxKind,
} from 'ts-morph';

import prettier from 'prettier';

const TARGET_FILE = 'packages/nodes-base/nodes/generated-nodes-types.ts';

const NODES_FOLDER_GLOBE = './packages/nodes-base/nodes/**/*.node.ts';
// const NODES_FOLDER_GLOBE =
// 	'packages/nodes-base/nodes/Google/CloudStorage/GoogleCloudStorage.node.ts';
// const NODES_FOLDER_GLOBE = 'packages/nodes-base/nodes/Set/v2/SetV2.node.ts';
// const NODES_FOLDER_GLOBE = 'packages/nodes-base/nodes/TheHiveProject/TheHiveProject.node.ts';

const project = new Project({
	compilerOptions: {
		target: ScriptTarget.ES2020,
	},
});

const nodesFiles = project.addSourceFilesAtPaths(NODES_FOLDER_GLOBE);

//-------------------------------------------------------------------------------

const getImport = (specifier: ImportSpecifier) => {
	const sourceFile = specifier.getSourceFile();
	let returnValue;

	sourceFile.forEachChild((child) => {
		if (child.getKind() === SyntaxKind.ImportDeclaration) {
			const declaration = child.asKindOrThrow(SyntaxKind.ImportDeclaration);

			if (declaration.getNamedImports().find((imp) => imp.getName() === specifier.getName())) {
				const importFile = declaration.getModuleSpecifierSourceFile();

				if (importFile) {
					const moduleSymbol = importFile.getSymbol();

					if (moduleSymbol) {
						const exportSymbols = moduleSymbol.getExports();
						for (const symbol of exportSymbols) {
							if ((symbol.getName(), specifier.getName())) {
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
		}
	});

	return returnValue;
};

const getClasses = (sourceFiles: SourceFile[]) => {
	const returnData: ClassDeclaration[] = [];

	sourceFiles.forEach((file) => {
		const classes = file.getClasses();

		classes.forEach((declaration) => {
			declaration.getImplements().forEach((impl) => {
				if (impl.getText() === 'INodeType') {
					returnData.push(declaration);
				}
			});
		});
	});

	return returnData;
};

const resolveSpreadAssignment = (
	parent: ObjectLiteralExpression,
	spreadAssignment: SpreadAssignment,
) => {
	const spreadExpression = spreadAssignment.getExpression();

	if (spreadExpression.isKind(SyntaxKind.Identifier)) {
		const referenceName = spreadExpression.getText();
		const referenceDeclaration = parent.getSourceFile().getVariableDeclaration(referenceName);

		if (referenceDeclaration) {
			const initializerNode = referenceDeclaration.getInitializer();

			if (initializerNode) {
				if (initializerNode.isKind(SyntaxKind.ImportSpecifier)) {
					return getImport(initializerNode);
				}

				return initializerNode;
			}
		}
	}

	return undefined;
};

function arrayLiteralExpressionToObjectLiteralExpression(
	expression: ArrayLiteralExpression,
): ObjectLiteralExpression[] {
	const returnData = expression
		.asKind(SyntaxKind.ArrayLiteralExpression)!
		.getElements()
		.flatMap((el) => {
			if (el.isKind(SyntaxKind.SpreadElement)) {
				return resolveSpreadToObjectLiterals(el) || [];
			} else if (el.isKind(SyntaxKind.ObjectLiteralExpression)) {
				return [el];
			}
			return [];
		});

	return returnData;
}

function resolveSpreadToObjectLiterals(spreadElement: SpreadElement): ObjectLiteralExpression[] {
	if (!spreadElement.isKind(SyntaxKind.SpreadElement)) {
		throw new Error('Node is not a SpreadElement');
	}

	console.log('SpreadElement', spreadElement.getText());

	const expression = spreadElement.getExpression();

	if (expression.isKind(SyntaxKind.ObjectLiteralExpression)) {
		return [expression];
	}

	if (expression.isKind(SyntaxKind.Identifier)) {
		const variableDeclaration = expression.getSymbol()?.getDeclarations()[0];
		if (variableDeclaration && variableDeclaration.isKind(SyntaxKind.VariableDeclaration)) {
			const initializer = variableDeclaration.getInitializer();
			if (initializer) {
				if (initializer && initializer.isKind(SyntaxKind.ArrayLiteralExpression)) {
					return arrayLiteralExpressionToObjectLiteralExpression(initializer);
				}
				return resolveSpreadToObjectLiterals(initializer.asKindOrThrow(SyntaxKind.SpreadElement));
			}
		}
		if (variableDeclaration && variableDeclaration.isKind(SyntaxKind.ImportSpecifier)) {
			const importValue = getImport(variableDeclaration);
			if (
				importValue &&
				(importValue as ObjectLiteralExpression).isKind(SyntaxKind.ObjectLiteralExpression)
			) {
				return [importValue];
			}
			if (
				importValue &&
				(importValue as ArrayLiteralExpression).isKind(SyntaxKind.ArrayLiteralExpression)
			) {
				return arrayLiteralExpressionToObjectLiteralExpression(importValue);
			}
		}
	}

	if (expression.isKind(SyntaxKind.PropertyAccessExpression)) {
		const propAccess = expression as PropertyAccessExpression;
		const propSymbol = propAccess.getSymbol();
		if (propSymbol) {
			const declarations = propSymbol.getDeclarations();
			if (declarations.length > 0) {
				const declaration = declarations[0];
				if (declaration && declaration.isKind(SyntaxKind.PropertyAssignment)) {
					const initializer = declaration.getInitializer();
					if (initializer && initializer.isKind(SyntaxKind.ObjectLiteralExpression)) {
						return [initializer];
					}
				} else if (declaration && declaration.isKind(SyntaxKind.VariableDeclaration)) {
					const initializer = declaration.getInitializer();

					if (initializer && initializer.isKind(SyntaxKind.SpreadElement)) {
						resolveSpreadToObjectLiterals(initializer);
					}
					return [];
				}
			}
		}
	}

	if (expression.isKind(SyntaxKind.ArrayLiteralExpression)) {
		return arrayLiteralExpressionToObjectLiteralExpression(expression);
	}

	return [];
}

const findProperties = (description: ObjectLiteralExpression): PropertyAssignment | undefined => {
	const properties = description.getProperty('properties');

	if (properties && properties.isKind(SyntaxKind.PropertyAssignment)) {
		return properties;
	}

	const spreadAssignments = description
		.getProperties()
		.filter((prop) => prop.isKind(SyntaxKind.SpreadAssignment));

	for (const spreadAssignment of spreadAssignments) {
		const resolved = resolveSpreadAssignment(description, spreadAssignment);
		if (resolved && resolved.isKind(SyntaxKind.ObjectLiteralExpression)) {
			const foundProperties = findProperties(resolved);
			if (foundProperties) {
				return foundProperties;
			}
		}
	}

	return undefined;
};

const getDescription = (declaration: ClassDeclaration): PropertyAssignment | undefined => {
	const prop = declaration.getProperty('description');

	let description = prop?.getInitializer();

	if (description?.isKind(SyntaxKind.Identifier)) {
		const variableDeclaration = description.findReferencesAsNodes()[0]?.getParent();

		if (variableDeclaration) {
			if (variableDeclaration.isKind(SyntaxKind.VariableDeclaration)) {
				const variableInitializer = variableDeclaration.getInitializer();

				if (variableInitializer?.isKind(SyntaxKind.ObjectLiteralExpression)) {
					description = variableInitializer;
				}
			} else if (variableDeclaration.isKind(SyntaxKind.ImportSpecifier)) {
				const importValue = getImport(variableDeclaration);
				if (
					importValue &&
					(importValue as ObjectLiteralExpression).isKind(SyntaxKind.ObjectLiteralExpression)
				) {
					return findProperties(importValue);
				}
			}
		}
	}

	if (description && description.isKind(SyntaxKind.ObjectLiteralExpression)) {
		return findProperties(description);
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
					if (value.isKind(SyntaxKind.ObjectLiteralExpression)) {
						return findProperties(value);
					}

					throw new Error('Could not get description');
				}
			}
		}
	}

	throw new Error('Could not get description');
};

function convertObjectLiteralToJS(node: any): any {
	const returnData: any = {};
	try {
		const allProperties = node.getProperties();

		allProperties.forEach((property: any) => {
			if (property.isKind(SyntaxKind.PropertyAssignment)) {
				const key = property.getName();
				const valueNode = property.getInitializer();
				const value = evaluateNode(valueNode);
				returnData[key] = value;
			}
		});
	} catch (error) {
		// console.log(error);
	}

	return returnData;
}

function evaluateNode(node: any): any {
	if (node.isKind(SyntaxKind.StringLiteral)) {
		return node.getLiteralValue();
	} else if (node.isKind(SyntaxKind.NumericLiteral)) {
		return Number(node.getText());
	} else if (node.isKind(SyntaxKind.TrueKeyword)) {
		return true;
	} else if (node.isKind(SyntaxKind.FalseKeyword)) {
		return false;
	} else if (node.isKind(SyntaxKind.ObjectLiteralExpression)) {
		return convertObjectLiteralToJS(node);
	} else if (node.isKind(SyntaxKind.ArrayLiteralExpression)) {
		return node.getElements().map((element: any) => evaluateNode(element));
	} else if (node.isKind(SyntaxKind.SpreadAssignment)) {
		return evaluateNode(resolveSpreadAssignment(node.getParent(), node));
	} else if (node.isKind(SyntaxKind.ImportSpecifier)) {
		return evaluateNode(getImport(node));
	}
	// Add more cases as needed for other types of literals
	return undefined;
}

const getProperties = (properties: PropertyAssignment | undefined): Record<string, any>[] => {
	if (properties) {
		let propertiesValue;
		const initializer = properties.getInitializer();

		if (initializer?.isKind(SyntaxKind.ArrayLiteralExpression)) {
			propertiesValue = initializer;
		}

		if (initializer?.isKind(SyntaxKind.Identifier)) {
			const variableDeclaration = initializer.findReferencesAsNodes()[0]?.getParent();

			if (variableDeclaration && variableDeclaration.isKind(SyntaxKind.VariableDeclaration)) {
				const variableInitializer = variableDeclaration.getInitializer();

				if (variableInitializer?.isKind(SyntaxKind.ObjectLiteralExpression)) {
					propertiesValue = variableInitializer;
				}
			}
		}

		if (propertiesValue && propertiesValue.isKind(SyntaxKind.ArrayLiteralExpression)) {
			const returnData: any[] = [];
			const nodes = propertiesValue.getElements();

			for (const node of nodes) {
				if (node.isKind(SyntaxKind.SpreadElement)) {
					let resolved = resolveSpreadToObjectLiterals(node);
					returnData.push(...resolved.map(convertObjectLiteralToJS));
					continue;
				}
				if (node.isKind(SyntaxKind.ImportSpecifier)) {
					const importValue = getImport(node);
					if (importValue) {
						returnData.push(convertObjectLiteralToJS(importValue));
					}
					continue;
				}
				if (node.isKind(SyntaxKind.ObjectLiteralExpression)) {
					returnData.push(convertObjectLiteralToJS(node));
					continue;
				}
			}

			return returnData;
		}
	}

	return [];
};

// ----------------------------------------------------------------------------

const propInfo: string[] = [];
const classes = getClasses(nodesFiles);

classes.forEach((declaration) => {
	const description = getDescription(declaration);
	const propertyObjects = getProperties(description);

	propInfo.push(`const ${declaration.getName()}Type = ${JSON.stringify(propertyObjects)};`);
});

prettier
	.format(propInfo.join('\n'), {
		parser: 'typescript',
		useTabs: true,
		tabWidth: 2,
		singleQuote: true,
	})
	.then((formatedCode) => {
		const targetFile = project.createSourceFile(TARGET_FILE, formatedCode, { overwrite: true });
		targetFile.saveSync();
	});

// END ------------------------------------------------------------------------------
console.log('Nodes types generated for ' + classes.length + ' nodes');
