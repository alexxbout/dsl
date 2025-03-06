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

        // Envoyer directement la notification au serveur pour interprétation
        // sans essayer de récupérer le contenu du document
        client.sendNotification('custom/interpret', uri);
    });

    // Écouter les résultats de l'interprétation
    client.onNotification('custom/interpretResult', (result: any) => {
        console.info('setup : interpretResult', result);
        
        if (result && result.success) {
            // Récupérer les commandes générées par l'interpréteur
            const commands = result.result.commands;
            console.log('Commandes générées:', commands);
            
            if (!commands || commands.length === 0) {
                console.warn('Aucune commande générée par l\'interpréteur');
                return;
            }
            
            // Réinitialiser la position du robot
            const scene = win.scene as BaseScene;
            scene.resetRobot();
            
            // Exécuter les commandes une par une
            executeCommands(commands, scene);
            
            // Mettre à jour le simulateur
            setupSimulator(scene);
        } else {
            console.error('Erreur d\'interprétation:', result ? result.error : 'Résultat indéfini');
            // Afficher l'erreur à l'utilisateur
            alert('Erreur d\'interprétation: ' + (result ? result.error : 'Résultat indéfini'));
        }
    });

    // Fonction pour exécuter les commandes
    const executeCommands = (commands: any[], scene: Scene) => {
        console.log('Exécution de', commands.length, 'commandes');
        
        // Trier les commandes par timestamp
        commands.sort((a, b) => a.timestamp - b.timestamp);
        
        // S'assurer que le robot visuel est correctement initialisé
        if (win.p5robot) {
            // Synchroniser le robot visuel avec le robot de la scène
            win.p5robot.updatePosition(
                scene.robot.pos.x,
                scene.robot.pos.y,
                scene.robot.rad * 180 / Math.PI // Convertir les radians en degrés
            );
            
            // Définir la vitesse d'animation du robot
            win.p5robot.setAnimationSpeed(0.05); // Ajuster selon la vitesse souhaitée
        }
        
        // Exécuter les commandes séquentiellement avec animation
        executeNextCommand(commands, 0, scene);
    };
    
    // Fonction récursive pour exécuter les commandes une par une
    const executeNextCommand = (commands: any[], index: number, scene: Scene) => {
        if (index >= commands.length) {
            console.log('Toutes les commandes ont été exécutées');
            return;
        }
        
        const command = commands[index];
        console.log(`Exécution de la commande ${index + 1}/${commands.length}:`, command);
        
        try {
            // Appliquer la commande au robot de la scène
            let moveSuccessful = true; // Par défaut, on suppose que le mouvement est possible
            
            switch (command.type) {
                case 'turn':
                    console.log(`Rotation de ${command.angle} degrés`);
                    scene.robot.turn(command.angle * Math.PI / 180); // Convertir les degrés en radians
                    
                    // Appliquer la même commande au robot visuel
                    if (win.p5robot) {
                        win.p5robot.turn(command.angle);
                    }
                    break;
                case 'move':
                    // Convertir la distance en mm si nécessaire
                    let distance = command.distance;
                    if (command.unit === 'cm') {
                        distance *= 10; // Convertir cm en mm
                    }
                    console.log(`Déplacement de ${distance}mm (${command.distance}${command.unit})`);
                    
                    // Vérifier si le mouvement est possible (pas de collision)
                    moveSuccessful = scene.robot.move(distance);
                    
                    // Appliquer la même commande au robot visuel seulement si le mouvement est possible
                    if (moveSuccessful && win.p5robot) {
                        win.p5robot.move(distance);
                    } else if (!moveSuccessful) {
                        console.log("Mouvement impossible à cause d'une collision - Le robot reste immobile");
                    }
                    break;
                case 'side':
                    // Convertir la distance en mm si nécessaire
                    let sideDistance = command.distance;
                    if (command.unit === 'cm') {
                        sideDistance *= 10; // Convertir cm en mm
                    }
                    // Appliquer la direction (gauche ou droite)
                    if (command.direction === 'right') {
                        sideDistance = -sideDistance;
                    }
                    console.log(`Déplacement latéral de ${sideDistance}mm (${command.direction})`);
                    
                    // Vérifier si le mouvement est possible (pas de collision)
                    moveSuccessful = scene.robot.side(sideDistance);
                    
                    // Appliquer la même commande au robot visuel seulement si le mouvement est possible
                    if (moveSuccessful && win.p5robot) {
                        win.p5robot.side(sideDistance);
                    } else if (!moveSuccessful) {
                        console.log("Mouvement latéral impossible à cause d'une collision - Le robot reste immobile");
                    }
                    break;
                case 'setSpeed':
                    console.log(`Définition de la vitesse à ${command.value}`);
                    scene.robot.speed = command.value;
                    break;
                default:
                    console.warn('Commande inconnue:', command);
            }
            
            // Attendre que l'animation soit terminée avant d'exécuter la commande suivante
            checkAnimationComplete(commands, index, scene);
            
        } catch (error) {
            console.error(`Erreur lors de l'exécution de la commande ${index + 1}:`, error);
            // Passer à la commande suivante malgré l'erreur
            executeNextCommand(commands, index + 1, scene);
        }
    };
    
    // Fonction pour vérifier si l'animation est terminée
    const checkAnimationComplete = (commands: any[], index: number, scene: Scene) => {
        if (win.p5robot && win.p5robot.isAnimating) {
            // L'animation est toujours en cours, vérifier à nouveau après un court délai
            setTimeout(() => {
                checkAnimationComplete(commands, index, scene);
            }, 50); // Vérifier toutes les 50ms
        } else {
            // L'animation est terminée, passer à la commande suivante
            setTimeout(() => {
                executeNextCommand(commands, index + 1, scene);
            }, 200); // Pause de 200ms entre chaque commande
        }
    };

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
        
        // Effacer les entités existantes
        win.entities = [];

        // Ajouter les entités de la scène
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

        // Créer ou mettre à jour le robot visuel
        if (!win.p5robot) {
            win.p5robot = new Robot(
                factor,
                scene.robot.pos.x,
                scene.robot.pos.y,
                scene.robot.size.x * factor,
                scene.robot.size.y * factor,
                scene.robot.rad,
                p5
            );
        } else {
            // Mettre à jour la position et l'orientation du robot visuel
            // Utiliser updatePosition pour une mise à jour instantanée (sans animation)
            win.p5robot.updatePosition(
                scene.robot.pos.x,
                scene.robot.pos.y,
                scene.robot.rad
            );
            
            // Mettre à jour le facteur d'échelle
            win.p5robot.factor = factor;
        }
        
        console.log("Robot positionné à:", scene.robot.pos.x, scene.robot.pos.y, "avec angle:", scene.robot.rad);
        
        // Forcer le rafraîchissement de l'affichage
        if (win.p5instance && typeof win.p5instance.redraw === 'function') {
            win.p5instance.redraw();
        }
    }

    client.onNotification('custom/interpret', (uri: string) => {
        console.info('setup : interpret - Notification reçue du client');
        // Ne rien faire ici, car cette notification est déjà envoyée par la fonction execute
    });

    // Listen to custom notifications coming from the server, here to call the "test" function
    // client.onNotification('custom/hello', hello);
    
    // Initialiser la scène
    win.scene = new BaseScene();
    
    // Initialiser le simulateur avec la scène
    setupSimulator(win.scene);
    
    // Exposer les fonctions au contexte global
    win.mazinator = mazinator;
    win.execute = execute;
    
    // Configurer les boutons de l'interface
    const mazinatorButton = document.getElementById('Mazinator');
    if (mazinatorButton) {
        mazinatorButton.addEventListener('click', () => {
            mazinator();
        });
    } else {
        console.warn("Bouton 'Mazinator' non trouvé dans le DOM");
    }
    
    const executeButton = document.getElementById('Execute Simulation');
    if (executeButton) {
        executeButton.addEventListener('click', () => {
            execute(win.scene as Scene);
        });
    } else {
        console.warn("Bouton 'Execute Simulation' non trouvé dans le DOM");
    }
    
    const restartButton = document.getElementById('Restart Simulation');
    if (restartButton) {
        restartButton.addEventListener('click', () => {
            const scene = win.scene as BaseScene;
            scene.resetRobot();
            setupSimulator(scene);
        });
    } else {
        console.warn("Bouton 'Restart Simulation' non trouvé dans le DOM");
    }
    
    const clearButton = document.getElementById('Clear Data');
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            const scene = win.scene as BaseScene;
            scene.clearEntities();
            setupSimulator(scene);
        });
    } else {
        console.warn("Bouton 'Clear Data' non trouvé dans le DOM");
    }
    
    console.log("Setup terminé, simulateur initialisé");
}