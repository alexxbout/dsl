import { Scene } from "../simulator/scene.js";
import { Robot } from "./robot.js";
import { Wall } from "./wall.js";

export type CustomWindow = typeof window & {
    entities: Wall[],
    time: number,
    lastTimestamp: number,
    scene: Scene | undefined,
    p5robot: Robot,
    deltaTime: number
    setup: () => void
    resetSimulation: () => void
    hello: (name: string) => void
    typecheck: (input: any) => void
    execute: (scene: Scene) => void
};