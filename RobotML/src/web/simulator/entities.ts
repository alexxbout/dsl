import { Scene } from "./scene.js";
import { Ray, Vector } from './utils.js';

export interface Entities {
    type:string;
    pos:Vector;
    size:Vector;

    intersect(ray: Ray) : Vector[];
}

export class Robot implements Entities{
    type:string = "Robot";
    scene:Scene;
    pos:Vector;
    size:Vector;
    rad:number; // stored in radian
    speed:number
  
    constructor(pos:Vector, size:Vector, angle:number, speed:number, scene:Scene) {
        this.pos = pos;
        this.size = size;
        this.rad = this.degreesToRadians(angle);
        this.speed = speed;
        this.scene = scene;
    }
    
    // Utility function to convert degrees to radians
    degreesToRadians(degrees: number): number {
        return degrees * Math.PI / 180;
    }
  
    intersect(ray :Ray) : Vector[] {
        return [] as Vector[];
    }

    turn(angle:number) : boolean {
        // Convert angle from degrees to radians
        const angleRad = this.degreesToRadians(angle);
        
        // Update the robot's orientation
        this.rad += angleRad;
        
        // Normaliser l'angle entre 0 et 2π
        this.rad = this.rad % (2 * Math.PI);
        if (this.rad < 0) {
            this.rad += 2 * Math.PI;
        }
        
        // Enregistrer un timestamp pour cette action
        this.scene.timestamps.push(new Timestamp(this.scene.time++, this));
        
        console.log(`Robot: Tourne de ${angle} degrés, nouvelle orientation: ${this.rad * 180 / Math.PI}°`);
        return true; // La rotation est toujours possible
    }

    move(dist:number) : boolean {
        // Calculer le déplacement en fonction de l'orientation du robot
        const direction = Vector.fromAngle(this.rad, 1);
        
        // Calculer la nouvelle position
        const newPos = this.pos.plus(direction.scale(dist));
        
        // Mettre à jour la position du robot
        this.pos = newPos;
        
        // Enregistrer un timestamp pour cette action
        this.scene.timestamps.push(new Timestamp(this.scene.time++, this));
        
        console.log(`Robot: Avance de ${dist}mm, nouvelle position: (${this.pos.x}, ${this.pos.y})`);
        return true;
    }

    side(dist:number) : boolean {
        // Calculer le déplacement latéral (perpendiculaire à l'orientation)
        const sideDirection = Vector.fromAngle(this.rad + Math.PI/2, 1);
        
        // Calculer la nouvelle position
        const newPos = this.pos.plus(sideDirection.scale(dist));
        
        // Mettre à jour la position du robot
        this.pos = newPos;
        
        // Enregistrer un timestamp pour cette action
        this.scene.timestamps.push(new Timestamp(this.scene.time++, this));
        
        console.log(`Robot: Déplacement latéral de ${dist}mm, nouvelle position: (${this.pos.x}, ${this.pos.y})`);
        return true;
    }
    
    // Méthode auxiliaire pour vérifier les collisions
    private checkCollision(newPos: Vector): boolean {
        // Vérifier si la nouvelle position est dans les limites de la scène
        if (newPos.x < 0 || newPos.x > this.scene.size.x || 
            newPos.y < 0 || newPos.y > this.scene.size.y) {
            return false;
        }
        
        // Rayon du robot (considéré comme un cercle)
        const robotRadius = Math.max(this.size.x, this.size.y) / 2;
        
        // Vérifier les collisions avec les autres entités
        for (const entity of this.scene.entities) {
            // Ignorer le robot lui-même
            if (entity === this) continue;
            
            // Traitement spécifique selon le type d'entité
            if (entity.type === "Wall") {
                // Pour un mur, on vérifie si le robot intersecte la ligne du mur
                // Créer un rayon depuis la nouvelle position vers le mur
                const ray = new Ray(newPos, entity.pos.minus(newPos));
                
                // Vérifier si le rayon intersecte le mur
                const intersections = entity.intersect(ray);
                
                // S'il y a une intersection et qu'elle est à une distance inférieure au rayon du robot
                if (intersections.length > 0) {
                    const distance = newPos.minus(intersections[0]).norm();
                    if (distance < robotRadius) {
                        return false;
                    }
                }
            } 
            else if (entity.type === "Block") {
                // Pour un bloc, on vérifie si le robot est à l'intérieur du bloc
                // ou si la distance entre le centre du robot et le bloc est inférieure au rayon
                
                // Vérifier si le centre du robot est à l'intérieur du bloc
                if (newPos.x >= entity.pos.x && newPos.x <= entity.pos.x + entity.size.x &&
                    newPos.y >= entity.pos.y && newPos.y <= entity.pos.y + entity.size.y) {
                    return false;
                }
                
                // Vérifier la distance entre le centre du robot et les bords du bloc
                // Trouver le point le plus proche du bloc par rapport au centre du robot
                const closestX = Math.max(entity.pos.x, Math.min(newPos.x, entity.pos.x + entity.size.x));
                const closestY = Math.max(entity.pos.y, Math.min(newPos.y, entity.pos.y + entity.size.y));
                
                // Calculer la distance entre ce point et le centre du robot
                const dx = newPos.x - closestX;
                const dy = newPos.y - closestY;
                const distanceSquared = dx * dx + dy * dy;
                
                // Si la distance est inférieure au rayon du robot, il y a collision
                if (distanceSquared < robotRadius * robotRadius) {
                    return false;
                }
            }
        }
        
        // Pas de collision détectée
        return true;
    }

    getRay(){
        // Créer un rayon qui part de la position du robot dans la direction de son orientation
        // Le vecteur est inversé (scale(-1)) car nous voulons que le rayon parte du robot
        return new Ray(this.pos, Vector.fromAngle(this.rad, 10000).scale(-1));
    }
    
    // Méthode pour calculer la distance à un obstacle dans la direction du robot
    getDistanceToObstacle(): number {
        // Obtenir le rayon dans la direction du robot
        const ray = this.getRay();
        
        // Trouver l'intersection avec les entités de la scène
        const intersection = ray.intersect(this.scene.entities);
        
        // Si une intersection est trouvée, calculer la distance
        if (intersection) {
            return this.pos.minus(intersection).norm();
        }
        
        // Si aucune intersection n'est trouvée, retourner une valeur très grande
        return Infinity;
    }

    // Méthode pour vérifier si un mouvement est possible sans l'exécuter
    canMove(dist:number) : boolean {
        // Calculer le déplacement en fonction de l'orientation du robot
        const direction = Vector.fromAngle(this.rad, 1);
        
        // Calculer la nouvelle position
        const newPos = this.pos.plus(direction.scale(dist));
        
        // Vérifier les collisions avec les entités de la scène
        return this.checkCollision(newPos);
    }
    
    // Méthode pour vérifier si un déplacement latéral est possible sans l'exécuter
    canSide(dist:number) : boolean {
        // Calculer le déplacement latéral (perpendiculaire à l'orientation)
        const sideDirection = Vector.fromAngle(this.rad + Math.PI/2, 1);
        
        // Calculer la nouvelle position
        const newPos = this.pos.plus(sideDirection.scale(dist));
        
        // Vérifier les collisions avec les entités de la scène
        return this.checkCollision(newPos);
    }
}

export class Timestamp extends Robot{
    time:number;

    constructor(time:number, robot:Robot){
        super(robot.pos.scale(1), robot.size.scale(1), robot.rad, robot.speed, robot.scene);
        this.rad = robot.rad;
        this.time = time;
    }
}

export class Block implements Entities{
    type:string = "Block";
    pos:Vector;
    size:Vector;
  
    constructor(pos:Vector, size:Vector) {
        this.pos = pos;
        this.size = size;
    }  
  
    intersect(ray :Ray) : Vector[] {

        let getPOI = ray.getPoiFinder()  
        let pois:(Vector|undefined)[] = new Array(4);
        pois[0] = getPOI(this.pos,                            this.pos.plus(this.size.projX()));
        pois[1] = getPOI(this.pos,                            this.pos.plus(this.size.projY()));
        pois[2] = getPOI(this.pos.plus(this.size.projX()),    this.pos.plus(this.size));
        pois[3] = getPOI(this.pos.plus(this.size.projY()),    this.pos.plus(this.size));

        return pois.filter(x => x !== undefined) as Vector[];
    }
}

export class Wall implements Entities{
    type:string = "Wall";
    pos:Vector;
    size:Vector;

    constructor(p1:Vector, p2:Vector) {
        this.pos = p1;
        this.size = p2;
    }
      
    intersect(ray:Ray) : Vector[] {
        const poi = ray.getPoiFinder()(this.pos, this.size);
        return poi ? ([poi] as Vector[]) : ([] as Vector[]);
    }
}