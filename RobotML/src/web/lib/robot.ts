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

    // Utility function to convert degrees to radians
    degreesToRadians(degrees: number): number {
        return degrees * Math.PI / 180;
    }

    show() {
        this.updateAnimation();
        
        this.p5.push();
        const canvasX = this.x * this.factor;
        const canvasY = this.y * this.factor;
        this.p5.translate(canvasX, canvasY);
        
        // Convertir l'angle en radians pour p5.js
        const angleRad = this.degreesToRadians(this.angle);
        this.p5.rotate(-angleRad); // Inverser le sens de rotation pour correspondre au système de coordonnées
        
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
        // L'angle est déjà en degrés, pas besoin de conversion
        // Calculer le nouvel angle cible en ajoutant l'angle de rotation
        this.targetAngle = this.angle + angle;
        
        // Normaliser l'angle cible entre 0 et 360 degrés
        while (this.targetAngle >= 360) {
            this.targetAngle -= 360;
        }
        while (this.targetAngle < 0) {
            this.targetAngle += 360;
        }
        
        // Activer l'animation
        this.isAnimating = true;
        
        console.log(`Robot: Tourne de ${angle} degrés, angle actuel: ${this.angle}°, angle cible: ${this.targetAngle}°`);
    }

    move(dist: number) {
        // Calculer la position cible en utilisant l'angle en degrés
        const angleRad = this.degreesToRadians(this.angle);
        const anglecos = Math.cos(angleRad);
        const anglesin = Math.sin(angleRad);
        
        // Calculer la nouvelle position cible
        // Note: Dans p5.js, l'axe Y est inversé par rapport au simulateur
        const newTargetX = this.x + anglecos * dist;
        const newTargetY = this.y - anglesin * dist;  // Inverser le signe pour correspondre à p5.js
        
        // Mettre à jour les coordonnées cibles
        this.targetX = newTargetX;
        this.targetY = newTargetY;
        
        console.log(`Robot visuel: Déplacement vers (${this.targetX}, ${this.targetY}) avec angle ${this.angle}°`);
        this.isAnimating = true;
    }

    side(dist: number) {
        // Pour un déplacement latéral, on ajoute 90° à l'angle actuel
        const sideAngleRad = this.degreesToRadians(this.angle + 90);
        const anglecos = Math.cos(sideAngleRad);
        const anglesin = Math.sin(sideAngleRad);
        
        // Calculer la nouvelle position cible
        // Note: Dans p5.js, l'axe Y est inversé par rapport au simulateur
        const newTargetX = this.x + anglecos * dist;
        const newTargetY = this.y - anglesin * dist;  // Inverser le signe pour correspondre à p5.js
        
        // Mettre à jour les coordonnées cibles
        this.targetX = newTargetX;
        this.targetY = newTargetY;
        
        console.log(`Robot visuel: Déplacement latéral vers (${this.targetX}, ${this.targetY}) avec angle ${this.angle}°`);
        this.isAnimating = true;
    }

    updatePosition(x: number, y: number, angle: number) {
        // Si une animation est en cours, ne pas interrompre brutalement
        if (this.isAnimating) {
            this.targetX = x;
            this.targetY = y;
            this.targetAngle = angle;
        } else {
            // Si pas d'animation en cours, mettre à jour directement
            this.x = x;
            this.y = y;
            this.angle = angle;
            this.targetX = x;
            this.targetY = y;
            this.targetAngle = angle;
        }
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