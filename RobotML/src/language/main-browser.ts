import { EmptyFileSystem, URI } from 'langium';
import { startLanguageServer } from 'langium/lsp';
import { BrowserMessageReader, BrowserMessageWriter, createConnection } from 'vscode-languageserver/browser.js';
import { RobotMLInterpreter } from '../semantics/interpreter.js';
import { createRobotMlServices } from './robot-ml-module.js';
import { DSLProgram } from './robot-ml-visitor.js';

declare const self: DedicatedWorkerGlobalScope;

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

const { shared } = createRobotMlServices({ connection, ...EmptyFileSystem });

function getModelFromUri(uri: string): DSLProgram | undefined {
    const document = shared.workspace.LangiumDocuments.getDocument(URI.parse(uri));
    if(document && (document.diagnostics === undefined || document?.diagnostics?.filter((i) => i.severity === 1).length === 0)) {
        return document.parseResult.value as DSLProgram;
    }
    return undefined;
}

connection.onNotification("custom/interpret", (uri: string) => {
    const model = getModelFromUri(uri);
    if (model) {
        try {
            const interpreter = new RobotMLInterpreter();
            const result = interpreter.interpret(model);
            connection.sendNotification("custom/interpretResult", { 
                success: true, 
                result 
            });
        } catch (error) {
            connection.sendNotification("custom/interpretResult", { 
                success: false, 
                error: error instanceof Error ? error.message : String(error) 
            });
        }
    } else {
        connection.sendNotification("custom/interpretResult", { 
            success: false, 
            error: "Failed to parse the model or model contains errors" 
        });
    }
});

startLanguageServer(shared);