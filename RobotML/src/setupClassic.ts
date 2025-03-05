import { MonacoEditorLanguageClientWrapper, UserConfig } from "monaco-editor-wrapper";
import { configureWorker, defineUserServices } from "./setupCommon.js";
import monarchSyntax from "./syntaxes/robot-ml.monarch.js";
import { setup } from "./web/setup.js";

function getDocumentUri(wrapper: MonacoEditorLanguageClientWrapper): string {
    return wrapper.getModel()!.uri.toString();
}

export const setupConfigClassic = (): UserConfig => {
    return {
        wrapperConfig: {
            serviceConfig: defineUserServices(),
            editorAppConfig: {
                $type: "classic",
                languageId: "robot-ml",
                code: `// RobotML is running in the web!`,
                useDiffEditor: false,
                languageExtensionConfig: { id: "langium" },
                languageDef: monarchSyntax,
                editorOptions: {
                    "semanticHighlighting.enabled": true,
                    theme: "vs-dark",
                },
            },
        },
        languageClientConfig: configureWorker(),
    };
};

export const executeClassic = async (htmlElement: HTMLElement) => {
    const userConfig = setupConfigClassic();
    const wrapper = new MonacoEditorLanguageClientWrapper();
    await wrapper.initAndStart(userConfig, htmlElement);

    // At the end of `executeClassic`
    const client = wrapper.getLanguageClient();
    if (!client) {
        throw new Error("Unable to obtain language client!");
    }

    setup(client, getDocumentUri(wrapper)); // setup function of the setup.ts file
};