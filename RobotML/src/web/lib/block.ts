import P5 from 'p5';

export class Block {

    x: number;
    y: number;
    width: number;
    height: number;
    p5: P5;

    constructor(_x: number, _y: number, _width: number, _height: number, p5: P5) {
        this.x = _x;
        this.y = _y;
        this.width = _width;
        this.height = _height;
        this.p5 = p5;
    }

    show() {
        this.p5.line(this.x               , this.y                , this.x + this.width   , this.y);
        this.p5.line(this.x               , this.y                , this.x                , this.y + this.height);
        this.p5.line(this.x + this.width  , this.y                , this.x + this.width   , this.y + this.height);
        this.p5.line(this.x               , this.y + this.height  , this.x + this.width   , this.y + this.height);
    }
}