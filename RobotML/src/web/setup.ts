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

    const execute = (async (scene: Scene) => {
        console.info("setup : execute");

        scene.resetRobot();

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

            if (win.p5robot) {
                win.p5robot.move(0);  // Cela va déclencher une animation vers la position initiale

                // Attendre que l'animation de retour soit terminée avant d'exécuter les commandes
                const checkInitialAnimation = () => {
                    if (win.p5robot.isAnimating) {
                        setTimeout(checkInitialAnimation, 50);
                    } else {
                        // Exécuter les commandes une par une
                        executeCommands(commands, scene);
                    }
                };
                checkInitialAnimation();
            } else {
                // Si pas de robot visuel, exécuter directement les commandes
                executeCommands(commands, scene);
            }
        } else {
            console.error('Erreur d\'interprétation:', result ? result.error : 'Résultat indéfini');
            // Afficher l'erreur à l'utilisateur
            alert('Erreur d\'interprétation: ' + (result ? result.error : 'Résultat indéfini'));
        }
    });

    // Utility function to convert degrees to radians
    const degreesToRadians = (degrees: number): number => {
        return degrees * Math.PI / 180;
    };
    
    // Utility function to convert radians to degrees
    const radiansToDegrees = (radians: number): number => {
        return radians * 180 / Math.PI;
    };

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
                radiansToDegrees(scene.robot.rad) // Convertir les radians en degrés
            );
            
            // Définir la vitesse d'animation du robot
            win.p5robot.setAnimationSpeed(0.05); // Ajuster selon la vitesse souhaitée
            
            // Forcer un rafraîchissement pour s'assurer que le robot est bien affiché
            if (win.p5instance && typeof win.p5instance.redraw === 'function') {
                win.p5instance.redraw();
            }
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
            switch (command.type) {
                case 'turn':
                    console.log(`Rotation de ${command.angle} degrés`);
                    // Appliquer la rotation au robot du simulateur (qui attend des degrés)
                    scene.robot.turn(command.angle);
                    
                    // Appliquer la même commande au robot visuel (en degrés)
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
                    
                    // Appliquer la direction
                    switch (command.direction) {
                        case 'forward':
                            console.log(`Déplacement avant de ${distance}mm (${command.distance}${command.unit})`);
                            scene.robot.move(distance);
                            if (win.p5robot) {
                                win.p5robot.move(distance);
                            }
                            break;
                        case 'backward':
                            console.log(`Déplacement arrière de ${distance}mm (${command.distance}${command.unit})`);
                            scene.robot.move(-distance);
                            if (win.p5robot) {
                                win.p5robot.move(-distance);
                            }
                            break;
                        case 'left':
                            console.log(`Déplacement latéral gauche de ${distance}mm (${command.distance}${command.unit})`);
                            scene.robot.side(distance);
                            if (win.p5robot) {
                                win.p5robot.side(distance);
                            }
                            break;
                        case 'right':
                            console.log(`Déplacement latéral droit de ${distance}mm (${command.distance}${command.unit})`);
                            scene.robot.side(-distance);
                            if (win.p5robot) {
                                win.p5robot.side(-distance);
                            }
                            break;
                        default:
                            console.warn(`Direction inconnue: ${command.direction}`);
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
            console.log(`Animation en cours pour la commande ${index + 1}, vérification dans 50ms`);
            setTimeout(() => {
                checkAnimationComplete(commands, index, scene);
            }, 50); // Vérifier toutes les 50ms
        } else {
            // L'animation est terminée, passer à la commande suivante
            console.log(`Animation terminée pour la commande ${index + 1}, passage à la commande suivante dans 200ms`);
            setTimeout(() => {
                executeNextCommand(commands, index + 1, scene);
            }, 200); // Pause de 200ms entre chaque commande
        }
    };

    const mazinator = () => {
        console.info("setup : mazinator");

        const scene = win.scene as BaseScene;

        scene.clear();

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
                radiansToDegrees(scene.robot.rad), // Convertir les radians en degrés
                p5
            );
        } else {
            // Mettre à jour la position et l'orientation du robot visuel
            // Utiliser updatePosition pour une mise à jour instantanée (sans animation)
            win.p5robot.updatePosition(
                scene.robot.pos.x,
                scene.robot.pos.y,
                radiansToDegrees(scene.robot.rad) // Convertir les radians en degrés
            );
            
            // Mettre à jour le facteur d'échelle
            win.p5robot.factor = factor;
        }
        
        console.log("Robot positionné à:", scene.robot.pos.x, scene.robot.pos.y, "avec angle:", radiansToDegrees(scene.robot.rad), "degrés");
        
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
    
    console.log("Setup terminé, simulateur initialisé");
}