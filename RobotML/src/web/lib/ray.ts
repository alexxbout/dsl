import P5 from "p5";
import { CustomWindow } from "./utils.js";
import { Vector } from "../simulator/utils.js";
import { Ray as SimulatorRay } from "../simulator/utils.js";

const win = window as CustomWindow;

export class Ray {

    x: number;
    y: number;
    angle: number;
    v: P5.Vector;
    poi: number[] | undefined | null;
    p5: P5;

    constructor(x: number, y: number, angle: number, p5: P5) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.v = P5.Vector.fromAngle(angle, 1000);
        this.poi = undefined;
        this.p5 = p5;
    }

    show() {
        this.p5.push();
        this.p5.stroke(10, 255, 10);
        this.p5.translate(this.x, this.y);
        this.p5.line(0, 0, this.v.x, this.v.y);
        this.p5.pop();
      }
    
      intersect() {
        let pois: Vector[] = [];
        for (var i = 0; i < win.entities.length; i++) {
          let e = win.entities[i];
          let entityPOI = e.intersect(this as unknown as SimulatorRay);
          pois = pois.concat(entityPOI);
        }
    
        this.findClosestPoi(pois);
      }
    
      findClosestPoi(pois: Vector[]) {
        let idx = 0;
        let minDist = Infinity;
        if (pois.every(ele => ele === null)) {
          this.poi = null;
        } else {
          for (var i = 0; i < pois.length; i++) {
            if (pois[i] != null) {
              let d = this.p5.dist(this.x, this.y, pois[i].x, pois[i].y);
              if (d < minDist) {
                minDist = d;
                idx = i;
              }
            }
          }
          this.poi = pois[idx] as unknown as number[];
        }
        this.setV();
      }
    
      setV() {
        if (this.poi == null) {
          this.v = P5.Vector.fromAngle(this.angle, 1000);
        } else {
          this.v.x = this.poi[0] - this.x;
          this.v.y = this.poi[1] - this.y;
        }
      }
}