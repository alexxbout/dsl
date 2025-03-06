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
        
        // Draw Pacman body
        this.p5.fill(255, 255, 0); // Yellow color
        this.p5.noStroke();
        
        // Calculate mouth angle based on animation
        const mouthAngle = this.p5.map(Math.sin(this.p5.frameCount * 0.1), -1, 1, 0.05, 0.2);
        
        // Draw arc for pacman shape
        this.p5.arc(0, 0, this.width, this.height, 
                    mouthAngle * Math.PI, 
                    (2 - mouthAngle) * Math.PI);
                    
        this.p5.pop();
    }
  
    turn(angle: number) {
        // Convert angle from degrees to radians
        const angleRad = angle * Math.PI / 180;
        
        // Calculate target angle in radians based on current angle
        this.targetAngle = this.angle + angleRad;
        
        // Normalize target angle between 0 and 2π radians
        while (this.targetAngle < 0) {
            this.targetAngle += 2 * Math.PI;
        }
        while (this.targetAngle >= 2 * Math.PI) {
            this.targetAngle -= 2 * Math.PI;
        }
        
        console.log(`Robot: Rotation of ${angle}° (${angleRad.toFixed(4)} rad) - Current angle: ${this.angle} rad - Target angle: ${this.targetAngle} rad`);
        
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