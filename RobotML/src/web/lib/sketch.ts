import P5 from "p5";
import { Robot } from "./robot.js";
import { CustomWindow } from "./utils.js";
import { Wall } from "./wall.js";

const win = window as CustomWindow;

const sketch = (p: P5) => {
    p.setup = () => {
        const canvas = p.createCanvas(1000, 1000, document.getElementById("simulator") as HTMLCanvasElement);
        canvas.parent("simulator-wrapper");
        win.entities = [];
        win.time = 0;
        win.lastTimestamp = 0;
        win.deltaTime = 0.016; // ~60fps
        win.scene = undefined;
        win.p5instance = p;
        win.p5robot = new Robot(1, p.width / 2, p.height / 2, 30, 30, 0, p);
    };

    p.draw = () => {
        p.background(0);
        p.stroke(255);
        p.strokeWeight(1);

        for (var e = 0; e < win.entities.length; e++) {
            (win.entities[e] as Wall).show();
        }

        if (win.p5robot !== null) {
            win.p5robot.show();
        }
    };
};

const p5 = new P5(sketch);

function resetSimulation() {
    win.time = 0;
    win.lastTimestamp = 0;
    
    if (win.p5robot) {
        win.p5robot.updatePosition(win.p5robot.x, win.p5robot.y, win.p5robot.angle);
    }
}

win.setup = p5.setup
win.resetSimulation = resetSimulation

export default p5;