import { Project, SyntaxKind, StringLiteral, TemplateExpression } from "ts-morph";
import * as fs from 'fs';
import * as path from 'path';

const project = new Project({
    tsConfigFilePath: "tsconfig.json",
});

const constantsMap = new Map<string, { key: string, params: string[], originalText: string }>();

function generateKey(text: string): string {
    let key = text.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
    if (key.startsWith('_')) key = key.slice(1);
    if (key.endsWith('_')) key = key.slice(0, -1);
    if (!key) key = 'LOG_MSG_' + Math.floor(Math.random() * 1000);
    if (key.length > 50) key = key.slice(0, 50).replace(/_[^_]*$/, '');
    return key;
}

const sourceFiles = project.getSourceFiles("src/**/*.ts");

for (const sourceFile of sourceFiles) {
    if (sourceFile.getFilePath().includes('src/constants/')) continue;
    
    let hasLoggerModification = false;

    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const callExpr of callExpressions) {
        const expression = callExpr.getExpression();
        if (expression.getKind() === SyntaxKind.PropertyAccessExpression) {
            const propAccess = expression.asKindOrThrow(SyntaxKind.PropertyAccessExpression);
            if (propAccess.getExpression().getText() === 'logger') {
                const args = callExpr.getArguments();
                if (args.length === 1) {
                    const arg = args[0];
                    let text = '';
                    let params: string[] = [];
                    let isTemplate = false;

                    if (arg.getKind() === SyntaxKind.StringLiteral) {
                        text = arg.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue();
                    } else if (arg.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
                        text = arg.asKindOrThrow(SyntaxKind.NoSubstitutionTemplateLiteral).getLiteralValue();
                    } else if (arg.getKind() === SyntaxKind.TemplateExpression) {
                        isTemplate = true;
                        const templateExpr = arg.asKindOrThrow(SyntaxKind.TemplateExpression);
                        text += templateExpr.getHead().getLiteralText();
                        for (const span of templateExpr.getTemplateSpans()) {
                            const exp = span.getExpression();
                            const paramName = `param${params.length + 1}`;
                            params.push(exp.getText());
                            text += `\${${paramName}}` + span.getLiteral().getLiteralText();
                        }
                    } else {
                        continue; // Not a simple string
                    }

                    const rawKeySource = text.replace(/\$\{.*?\}/g, '').trim();
                    let key = generateKey(rawKeySource);

                    // Handle duplicates
                    let originalKey = key;
                    let counter = 1;
                    while (constantsMap.has(key) && constantsMap.get(key)!.originalText !== text) {
                        key = `${originalKey}_${counter}`;
                        counter++;
                    }

                    if (!constantsMap.has(key)) {
                        constantsMap.set(key, { key, params: params.map((_, i) => `param${i + 1}`), originalText: text });
                    }

                    // Replace the argument with function call
                    if (isTemplate || params.length > 0) {
                        const newArgs = params.join(', ');
                        callExpr.replaceWithText(`logger.${propAccess.getName()}(LoggerMessages.${key}(${newArgs}))`);
                    } else {
                        callExpr.replaceWithText(`logger.${propAccess.getName()}(LoggerMessages.${key})`);
                    }
                    hasLoggerModification = true;
                }
            }
        }
    }

    if (hasLoggerModification) {
        // Add import
        const imports = sourceFile.getImportDeclarations();
        const hasLoggerMessages = imports.some(i => i.getNamedImports().some(n => n.getName() === 'LoggerMessages'));
        if (!hasLoggerMessages) {
            // Find path relative to current file
            const currentDir = path.dirname(sourceFile.getFilePath());
            let relPath = path.relative(currentDir, path.join(project.compilerOptions.get().rootDir || process.cwd() + '/src', 'constants', 'loggerMessages'));
            if (!relPath.startsWith('.')) relPath = './' + relPath;
            relPath = relPath.replace(/\\/g, '/');
            sourceFile.addImportDeclaration({
                namedImports: ['LoggerMessages'],
                moduleSpecifier: relPath
            });
        }
    }
}

// Generate LoggerMessages.ts
let loggerFileContent = "export const LoggerMessages = {\n";
for (const [key, data] of constantsMap.entries()) {
    if (data.params.length > 0) {
        const paramArgs = data.params.map((p) => `${p}: any`).join(', ');
        loggerFileContent += `  ${key}: (${paramArgs}) => \`${data.originalText}\`,\n`;
    } else {
        // use single quotes for simple strings, escape single quotes if present
        const val = data.originalText.replace(/'/g, "\\'");
        loggerFileContent += `  ${key}: '${val}',\n`;
    }
}
loggerFileContent += "};\n";

fs.writeFileSync('src/constants/loggerMessages.ts', loggerFileContent);
project.saveSync();
console.log("Logger refactoring complete!");
