import { MonacoLanguageClient } from 'monaco-languageclient';
import { Robot } from './lib/robot.js';
import p5 from "./lib/sketch.js";
import { CustomWindow } from './lib/utils.js';
import { Wall } from './lib/wall.js';
import { Scene } from './simulator/scene.js';

/**
 * Function to setup the simulator and the different notifications exchanged between the client and the server.
 * @param client the Monaco client, used to send and listen notifications.
 * @param uri the URI of the document, useful for the server to know which document is currently being edited.
 */
export function setup(client: MonacoLanguageClient, uri: string) {
    console.log("setup");
    
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
        console.info('typechecking current code...');

        // BONUS : Implement new semantics for typechecking
        // if(error.length > 0){
        //     const modal = document.getElementById("errorModal")! as HTMLElement;
            
        //     modal.style.display = "block";
        // } else {
        //     const modal = document.getElementById("validModal")! as HTMLElement;
        //     modal.style.display = "block";
        // }
    });

    const execute = (async (scene: Scene) => {
        setupSimulator(scene);
    });

    function setupSimulator(scene: Scene) {
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

    // TODO : to adapt
    win.execute = execute;
    win.execute = typecheck;
}