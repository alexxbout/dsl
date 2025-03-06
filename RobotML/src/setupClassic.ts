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
                code: `// RobotML is running in the web! ${CODE}`,
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

const CODE = `
let void main() {
    setSpeed(1/100)

    Forward 400 in cm
    Right 500 in cm
    var number i = 0

    setSpeed(5/10)

    loop i < 4 {
        Forward 100 in cm

        setSpeed(2/10)

        // Tourner à gauche de 90°
        Clock -90

        // Incrémentation de la boucle
        i = i + 1

        var number b = 0
        loop b <= 2 {
            if (b == 1) {
                Clock 180
            }

            b = b + 1
        }
    }
}
`;

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