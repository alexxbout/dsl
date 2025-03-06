import P5 from 'p5';

export class Robot {

    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
    factor: number;
    p5: P5;
    
    targetX: number;
    targetY: number;
    targetAngle: number;
    isAnimating: boolean = false;
    animationSpeed: number = 0.05;

    constructor(factor: number, _x = 0, _y = 0, _width = 0, _height = 0, _angle = 0, p5: P5) {
        this.x = _x;
        this.y = _y;
        this.width = _width;
        this.height = _height;
        this.angle = _angle;
        this.factor = factor;
        this.p5 = p5;
        
        this.targetX = _x;
        this.targetY = _y;
        this.targetAngle = _angle;
    }

    show() {
        this.updateAnimation();
        
        this.p5.push();
        const canvasX = this.x * this.factor;
        const canvasY = this.y * this.factor;
        this.p5.translate(canvasX, canvasY);
        this.p5.rotate(this.angle);
        this.p5.stroke(255, 255, 255);
        this.p5.rect(-this.height/2, -this.width/2, this.height, this.width);
        this.p5.stroke(255, 0, 0);
        this.p5.fill(255, 0, 0);
        const h = (Math.sqrt(3)/2) * (this.width/3)
        this.p5.triangle(-0.5*h, -(this.height/6), -0.5*h, this.height/6, 0.5*h, 0);
        this.p5.pop();
    }
  
    turn(angle: number) {
        // Convertir l'angle en degrés
        const angleDeg = angle;
        
        // Calculer le nouvel angle cible en tenant compte de l'angle actuel
        // Utiliser l'angle actuel comme base pour éviter les rotations multiples
        this.targetAngle = this.angle + angleDeg;
        
        // Normaliser l'angle cible entre 0 et 360 degrés
        while (this.targetAngle < 0) {
            this.targetAngle += 360;
        }
        while (this.targetAngle >= 360) {
            this.targetAngle -= 360;
        }
        
        console.log(`Robot: Rotation de ${angleDeg}° - Angle actuel: ${this.angle}° - Angle cible: ${this.targetAngle}°`);
        
        this.isAnimating = true;
    }

    move(dist: number) {
        // Calculer la position cible
        let anglecos = Math.cos(this.angle * Math.PI / 180);
        let anglesin = Math.sin(this.angle * Math.PI / 180);
        const newTargetX = this.x + anglecos * dist;
        const newTargetY = this.y + anglesin * dist;
        
        // Vérifier si le mouvement est possible (pas de collision)
        // Note: Dans le contexte visuel, nous ne pouvons pas vérifier les collisions directement
        // Nous supposons que le mouvement est possible et nous mettons à jour la cible
        this.targetX = newTargetX;
        this.targetY = newTargetY;
        
        console.log(`Robot visuel: Déplacement vers (${this.targetX}, ${this.targetY})`);
        this.isAnimating = true;
    }

    side(dist: number) {
        // Calculer la position cible pour un déplacement latéral
        let anglecos = Math.cos(this.angle * Math.PI / 180);
        let anglesin = Math.sin(this.angle * Math.PI / 180);
        const newTargetX = this.x + -anglesin * dist;
        const newTargetY = this.y + anglecos * dist;
        
        // Vérifier si le mouvement est possible (pas de collision)
        // Note: Dans le contexte visuel, nous ne pouvons pas vérifier les collisions directement
        // Nous supposons que le mouvement est possible et nous mettons à jour la cible
        this.targetX = newTargetX;
        this.targetY = newTargetY;
        
        console.log(`Robot visuel: Déplacement latéral vers (${this.targetX}, ${this.targetY})`);
        this.isAnimating = true;
    }

    updatePosition(x: number, y: number, angle: number) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        
        this.targetX = x;
        this.targetY = y;
        this.targetAngle = angle;
        
        this.isAnimating = false;
    }
    
    updateAnimation() {
        if (!this.isAnimating) return;
        
        // Interpolation linéaire vers la position cible
        this.x += (this.targetX - this.x) * this.animationSpeed;
        this.y += (this.targetY - this.y) * this.animationSpeed;
        
        // Interpolation de l'angle (en tenant compte des rotations)
        let angleDiff = this.targetAngle - this.angle;
        
        // Normaliser la différence d'angle pour prendre le chemin le plus court
        if (angleDiff > 180) angleDiff -= 360;
        if (angleDiff < -180) angleDiff += 360;
        
        this.angle += angleDiff * this.animationSpeed;
        
        // Normaliser l'angle entre 0 et 360 degrés
        while (this.angle < 0) {
            this.angle += 360;
        }
        while (this.angle >= 360) {
            this.angle -= 360;
        }
        
        // Vérifier si l'animation est terminée
        const distanceSquared = Math.pow(this.targetX - this.x, 2) + Math.pow(this.targetY - this.y, 2);
        const angleDiffAbs = Math.abs(angleDiff);
        
        if (distanceSquared < 0.01 && angleDiffAbs < 0.1) {
            // Animation terminée
            this.x = this.targetX;
            this.y = this.targetY;
            this.angle = this.targetAngle;
            this.isAnimating = false;
            console.log("Animation terminée - Position finale:", this.x, this.y, "Angle:", this.angle);
        }
    }
    
    isAnimationComplete(): boolean {
        return !this.isAnimating;
    }
    
    setAnimationSpeed(speed: number) {
        this.animationSpeed = Math.max(0.01, Math.min(1, speed));
    }
}