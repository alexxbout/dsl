import { Scene } from "../simulator/scene.js";
import { Robot } from "./robot.js";
import { Wall } from "./wall.js";
import P5 from 'p5';

export type CustomWindow = typeof window & {
    entities: Wall[],
    time: number,
    lastTimestamp: number,
    scene: Scene | undefined,
    p5robot: Robot,
    deltaTime: number,
    p5instance: P5,
    setup: () => void,
    resetSimulation: () => void,
    hello: (name: string) => void,
    typecheck: (input: any) => void,
    execute: (scene: Scene) => void,
    mazinator: () => void
};