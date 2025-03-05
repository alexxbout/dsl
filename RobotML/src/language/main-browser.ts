import { EmptyFileSystem, URI } from 'langium';
import { startLanguageServer } from 'langium/lsp';
import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser.js';
import { createRobotMlServices } from './robot-ml-module.js';
import { DSLProgram } from './robot-ml-visitor.js';

declare const self: DedicatedWorkerGlobalScope;

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

const { shared, RobotMl } = createRobotMlServices({ connection, ...EmptyFileSystem });

// function getModelFromUri(uri: string): DSLProgram | undefined {
//     const document = shared.workspace.LangiumDocuments.getDocument(URI.parse(uri));
//     if(document && (document.diagnostics === undefined || document?.diagnostics?.filter((i) => i.severity === 1).length === 0)) {
//         return document.parseResult.value as DSLProgram;
//     }
//     return undefined;
// }

connection.onNotification("custom/parseAndValidate", (uri: string) => {
    const document = shared.workspace.LangiumDocuments.getDocument(URI.parse(uri));
    if (!document) {
        connection.sendNotification("custom/parseAndValidate", {
            success: false,
            message: `Could not find document for URI: ${uri}`
        });
        return;
    }
    
    const typeChecker = RobotMl.visitors.RobotMlTypeChecker;
    typeChecker.visitRoot(document.parseResult.value as DSLProgram, (diagnostic) => {
        console.log(diagnostic);
    });
    // try {
    //     const document = shared.workspace.LangiumDocuments.getDocument(URI.parse(uri));
    //     if (!document) {
    //         connection.sendNotification("custom/typeCheckingResult", {
    //             success: false,
    //             message: `Could not find document for URI: ${uri}`
    //         });
    //         return;
    //     }

    //     // Check for lexer and parser errors
    //     const parseResult = document.parseResult;
    //     if (parseResult.lexerErrors.length > 0 || parseResult.parserErrors.length > 0) {
    //         const errors = [
    //             ...parseResult.lexerErrors.map(e => `Lexer error: ${e.message}`),
    //             ...parseResult.parserErrors.map(e => `Parser error: ${e.message}`)
    //         ];
    //         connection.sendNotification("custom/typeCheckingResult", {
    //             success: false,
    //             message: `Failed to parse document: ${errors.join(', ')}`
    //         });
    //         return;
    //     }

    //     // Get existing diagnostics (validation should have been done automatically)
    //     const diagnostics = document.diagnostics || [];
    //     const validationErrors = diagnostics.filter((issue: Diagnostic) => issue.severity === 1);

    //     if (validationErrors.length > 0) {
    //         connection.sendNotification("custom/typeCheckingResult", {
    //             success: false,
    //             message: `Validation errors: ${validationErrors.map((e: Diagnostic) => e.message).join(', ')}`,
    //             errors: validationErrors
    //         });
    //     } else {
    //         connection.sendNotification("custom/typeCheckingResult", {
    //             success: true,
    //             message: "Document parsed and validated successfully"
    //         });
    //     }
    // } catch (error) {
    //     connection.sendNotification("custom/typeCheckingResult", {
    //         success: false,
    //         message: `Error during validation: ${error instanceof Error ? error.message : String(error)}`
    //     });
    // }
});

// Interpret the program and return the result
// connection.onNotification("custom/interpret", (uri: string) => {
//     const model = getModelFromUri(uri);
//     if (model) {
//         try {
//             const interpreter = new RobotMLInterpreter();
//             const result = interpreter.interpret(model);
//             connection.sendNotification("custom/interpretResult", { 
//                 success: true, 
//                 result 
//             });
//         } catch (error) {
//             connection.sendNotification("custom/interpretResult", { 
//                 success: false, 
//                 error: error instanceof Error ? error.message : String(error) 
//             });
//         }
//     } else {
//         connection.sendNotification("custom/interpretResult", { 
//             success: false, 
//             error: "Failed to parse the model or model contains errors" 
//         });
//     }
// });

startLanguageServer(shared);