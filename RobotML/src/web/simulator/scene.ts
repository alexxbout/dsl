import * as Entities from "./entities.js";
import { Vector } from "./utils.js";

export interface Scene {
    size: Vector;
    entities: Entities.Entities[];
    robot: Entities.Robot;
    time: number;
    timestamps: Array<Entities.Timestamp>;
    mazinator(): void;
    clear(): void;
}

export class BaseScene implements Scene {
    size: Vector;
    entities: Entities.Entities[] = [];
    robot: Entities.Robot;
    time: number = 0;
    timestamps: Array<Entities.Timestamp> = [];

    constructor(size: Vector = new Vector(10000, 10000)) {
        console.info("scene : constructor");

        this.size = size;
        this.robot = new Entities.Robot(new Vector(250, 250), new Vector(250, 250), 0, 30, this);
        this.init();
    }

    private init() {
        this.entities.push(new Entities.Wall(Vector.null(), this.size.projX()));
        this.entities.push(new Entities.Wall(Vector.null(), this.size.projY()));
        this.entities.push(new Entities.Wall(this.size, this.size.projY()));
        this.entities.push(new Entities.Wall(this.size, this.size.projX()));
        this.timestamps.push(new Entities.Timestamp(0, this.robot));
    }

    public clearEntities() {
        // Conserver uniquement les murs de base (les 4 premiers éléments)
        this.entities = this.entities.slice(0, 4);

        // Réinitialiser les timestamps
        this.timestamps = [];
        this.timestamps.push(new Entities.Timestamp(0, this.robot));

        // Réinitialiser le temps
        this.time = 0;
    }

    public resetRobot() {
        // Réinitialiser la position et l'orientation du robot
        this.robot.pos = new Vector(250, 250);
        this.robot.rad = 0;
        this.robot.speed = 30;

        // Réinitialiser les timestamps
        this.timestamps = [];
        this.timestamps.push(new Entities.Timestamp(0, this.robot));

        // Réinitialiser le temps
        this.time = 0;
    }

    public mazinator(cellSize: number = 1000, wallThickness: number = 10) {
        console.info("scene : mazinator");

        const mazeWidth = Math.floor(this.size.x / cellSize);
        const mazeHeight = Math.floor(this.size.y / cellSize);
        const maze = Array.from({ length: mazeHeight }, () => Array(mazeWidth).fill(false));

        const stack: [number, number][] = [];
        const directions = [
            [0, -1], // up
            [1, 0], // right
            [0, 1], // down
            [-1, 0], // left
        ];

        const isValid = (x: number, y: number) => x >= 0 && y >= 0 && x < mazeWidth && y < mazeHeight && !maze[y][x];

        stack.push([0, 0]);
        maze[0][0] = true;

        while (stack.length > 0) {
            const [cx, cy] = stack[stack.length - 1];
            const validDirections = directions.filter(([dx, dy]) => isValid(cx + dx, cy + dy));

            if (validDirections.length > 0) {
                const [dx, dy] = validDirections[Math.floor(Math.random() * validDirections.length)];
                const nx = cx + dx;
                const ny = cy + dy;

                // Calculate wall position with spacing
                const startX = cx * cellSize + (cellSize - wallThickness) / 2;
                const startY = cy * cellSize + (cellSize - wallThickness) / 2;
                const endX = nx * cellSize + (cellSize - wallThickness) / 2;
                const endY = ny * cellSize + (cellSize - wallThickness) / 2;

                this.entities.push(new Entities.Wall(new Vector(startX, startY), new Vector(endX, endY)));

                maze[ny][nx] = true;
                stack.push([nx, ny]);
            } else {
                stack.pop();
            }
        }
    }

    public clear() {
        this.entities = [];
        this.timestamps = [];
        this.time = 0;

        this.init();
    }
}
