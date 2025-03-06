import { MonacoLanguageClient } from 'monaco-languageclient';
import { Robot } from './lib/robot.js';
import p5 from './lib/sketch.js';
import { CustomWindow } from './lib/utils.js';
import { Wall } from './lib/wall.js';
import { BaseScene, Scene } from './simulator/scene.js';

/**
 * Function to setup the simulator and the different notifications exchanged between the client and the server.
 * @param client the Monaco client, used to send and listen notifications.
 * @param uri the URI of the document, useful for the server to know which document is currently being edited.
 */
export function setup(client: MonacoLanguageClient, uri: string) {
    console.info("setup");
    
    const win = window as CustomWindow;

    // Modals for TypeChecking
    var errorModal = document.getElementById("errorModal")! as HTMLElement;
    var validModal = document.getElementById("validModal")! as HTMLElement;
    var closeError = document.querySelector("#errorModal .close")! as HTMLElement;
    var closeValid = document.querySelector("#validModal .close")! as HTMLElement;
    closeError.onclick = function() {
        errorModal.style.display = "none";
    }
    closeValid.onclick = function() {
        validModal.style.display = "none";
    }
    window.onclick = function(event) {
        if (event.target == validModal) {
            validModal.style.display = "none";
        }
        if (event.target == errorModal) {
            errorModal.style.display = "none";
        }
    } 

    const typecheck = (async (input: any) => {
        console.info('setup : typecheck');

        // BONUS : Implement new semantics for typechecking
        // Get diagnostics from the language client
        const errors: any[] = [];
        
        // You can populate errors by getting diagnostics from the client
        // For example:
        // const result = await client.sendRequest('textDocument/diagnostics', { uri });
        // if (result) errors.push(...result);
        
        if(errors.length > 0){
            const modal = document.getElementById("errorModal")! as HTMLElement;
            
            modal.style.display = "block";
        } else {
            const modal = document.getElementById("validModal")! as HTMLElement;
            modal.style.display = "block";
        }
    });

    const execute = (async (scene: Scene) => {
        console.info("setup : execute");

        // maybe typecheck here
    });

    const mazinator = () => {
        console.info("setup : mazinator");

        const scene = win.scene as BaseScene;

        scene.mazinator();

        setupSimulator(scene);
    }

    const setupSimulator = (scene: Scene) => {
        console.info("setup : setupSimulator");

        const wideSide = Math.max(scene.size.x, scene.size.y);
        let factor = 1000 / wideSide;

        win.scene = scene;

        scene.entities.forEach((entity) => {
            if (entity.type === "Wall") {
                win.entities.push(new Wall(
                    (entity.pos.x) * factor,
                    (entity.pos.y) * factor,
                    (entity.size.x) * factor,
                    (entity.size.y) * factor,
                    p5
                ));
            }
            if (entity.type === "Block") {
                win.entities.push(new Wall(
                    (entity.pos.x) * factor,
                    (entity.pos.y) * factor,
                    (entity.size.x) * factor,
                    (entity.size.y) * factor,
                    p5
                ));
            }
        });

        win.p5robot = new Robot(
            factor,
            scene.robot.pos.x,
            scene.robot.pos.y,
            scene.robot.size.x * factor,
            scene.robot.size.y * factor,
            scene.robot.rad,
            p5
        );
    }

    // Listen to custom notifications coming from the server, here to call the "test" function
    // client.onNotification('custom/hello', hello);
    win.scene = new BaseScene();
    
    win.mazinator = mazinator;
    win.execute = execute;
}