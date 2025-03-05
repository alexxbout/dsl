import P5 from 'p5';

export class Robot {

    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
    factor: number;
    p5: P5;

    constructor(factor: number, _x = 0, _y = 0, _width = 0, _height = 0, _angle = 0, p5: P5) {
        this.x = _x;
        this.y = _y;
        this.width = _width;
        this.height = _height;
        this.angle = _angle;
        this.factor = factor;
        this.p5 = p5;
    }

    show() {
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
  
    turn(angle: number){
        this.angle += angle;
        if(this.angle<0){
            this.angle += 360;
        } else if (this.angle >= 360){
            this.angle -= 360;
        }
    }

    move(dist: number){
        let anglecos = Math.cos(this.angle);
        let anglesin = Math.sin(this.angle);
        this.x += anglecos*dist;
        this.y += anglesin*dist;
    }

    side(dist: number){
        let anglecos = Math.cos(this.angle);
        let anglesin = Math.sin(this.angle);
        this.x += -anglesin*dist;
        this.y += anglecos*dist;
    }

}