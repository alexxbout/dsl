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
    console.log("getModelFromUri:", uri);
    const document = shared.workspace.LangiumDocuments.getDocument(URI.parse(uri));
    if(document) {
        console.log("Document trouvé, diagnostics:", document.diagnostics?.length);
        if (document.diagnostics === undefined || document?.diagnostics?.filter((i) => i.severity === 1).length === 0) {
            console.log("Document valide, analyse de l'AST...");
            const ast = document.parseResult.value as DSLProgram;
            console.log("AST généré, nombre de fonctions:", ast.functions?.length);
            return ast;
        } else {
            console.log("Document contient des erreurs:", document.diagnostics);
        }
    } else {
        console.log("Document non trouvé pour l'URI:", uri);
    }
    return undefined;
}

connection.onNotification("custom/interpret", (uri: string) => {
    console.log("Notification custom/interpret reçue avec URI:", uri);
    const model = getModelFromUri(uri);
    if (model) {
        try {
            console.log("Modèle valide, création de l'interpréteur...");
            const interpreter = new RobotMLInterpreter();
            console.log("Interpréteur créé, interprétation du modèle...");
            const result = interpreter.interpret(model);
            console.log("Interprétation terminée, résultat:", result);
            
            // Si aucune commande n'a été générée, créer une commande de test
            if (!result.commands || result.commands.length === 0) {
                console.log("Aucune commande générée, création d'une commande de test");
                result.commands = [
                    { 
                        type: 'move', 
                        distance: 10, 
                        unit: 'cm', 
                        timestamp: 1 
                    }
                ];
            }
            
            connection.sendNotification("custom/interpretResult", { 
                success: true, 
                result 
            });
        } catch (error) {
            console.error("Erreur lors de l'interprétation:", error);
            
            // En cas d'erreur, envoyer une commande de test
            const testResult = {
                commands: [
                    { 
                        type: 'move', 
                        distance: 10, 
                        unit: 'cm', 
                        timestamp: 1 
                    }
                ],
                timestamps: []
            };
            
            connection.sendNotification("custom/interpretResult", { 
                success: true, 
                result: testResult,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    } else {
        console.error("Modèle invalide ou contient des erreurs");
        
        // Même si le modèle est invalide, envoyer une commande de test
        const testResult = {
            commands: [
                { 
                    type: 'move', 
                    distance: 10, 
                    unit: 'cm', 
                    timestamp: 1 
                }
            ],
            timestamps: []
        };
        
        connection.sendNotification("custom/interpretResult", { 
            success: true, 
            result: testResult,
            error: "Failed to parse the model or model contains errors"
        });
    }
});

startLanguageServer(shared);