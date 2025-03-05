import P5 from "p5";

export class Wall {

    ax: number;
    ay: number;
    bx: number;
    by: number;
    p5: P5;

    constructor(ax: number, ay: number, bx: number, by: number, p5: P5) {
        this.ax = ax;
        this.ay = ay;
        this.bx = bx;
        this.by = by;
        this.p5 = p5;
    }

    show() {
        this.p5.line(this.ax, this.ay, this.bx, this.by);
      }

}