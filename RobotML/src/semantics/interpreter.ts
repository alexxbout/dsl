import * as ast from "../language/generated/ast.js";
import { AbstractVariableDecl, BinaryOperation, Block, BooleanExpr, BooleanLiteral, Clock, Command, Comment, DSLProgram, Expression, Forward, FunctionCall, FunctionDef, Literal, LogicalExpr, Loop, Movement, NumberLiteral, ParenExpr, Return, RobotMlVisitor, Rotation, Speed, Statement, UnitValue, Variable, VariableAssign, VariableDecl, VariableFunDecl } from "../language/robot-ml-visitor.js";

// Create environment and state objects for the interpreter
interface Environment {
    variables: Map<string, any>;
    parent?: Environment;
}

// Mock simulator types for type safety
interface SimulatorScene {
    robot: SimulatorRobot;
    entities: SimulatorEntity[];
    timestamps: SimulatorTimestamp[];
    time: number;
    size: { x: number, y: number };
}

interface SimulatorRobot {
    pos: { x: number, y: number };
    rad: number;
    speed: number;
    turn(angle: number): void;
    move(distance: number): void;
    side(distance: number): void;
    getRay(): SimulatorRay;
}

interface SimulatorRay {
    intersect(entities: SimulatorEntity[]): { x: number, y: number } | undefined;
}

interface SimulatorEntity {
    type: string;
    pos: { x: number, y: number };
}

interface SimulatorTimestamp {
    time: number;
    pos: { x: number, y: number };
    rad: number;
    speed: number;
}

// Result of the interpreter, tracking robot commands for display/simulation
export interface InterpreterResult {
    commands: RobotCommand[];
    timestamps: SimulatorTimestamp[];
}

// Types of robot commands that can be executed
export type RobotCommand = 
    | { type: 'turn'; angle: number; timestamp: number }
    | { type: 'move'; distance: number; unit: string; timestamp: number }
    | { type: 'side'; distance: number; direction: 'left' | 'right'; timestamp: number }
    | { type: 'setSpeed'; value: number; timestamp: number };

export class RobotMLInterpreter implements RobotMlVisitor {
    // Global environment for variables and functions
    private globalEnv: Environment = { variables: new Map<string, any>() };
    private currentEnv: Environment;
    private functions: Map<string, FunctionDef> = new Map();
    private returnValue: any = undefined;
    
    // Track robot commands and simulator state
    private commands: RobotCommand[] = [];
    private scene: SimulatorScene;
    private currentTime: number = 0;
    
    constructor() {
        this.currentEnv = this.globalEnv;
        // Create a mock scene for now - in a real implementation, this would be initialized with the actual simulator
        this.scene = this.createMockScene();
    }

    // Create a mock scene for testing
    private createMockScene(): SimulatorScene {
        const robot: SimulatorRobot = {
            pos: { x: 500, y: 500 },
            rad: 0,
            speed: 30,
            turn(angle: number) {
                this.rad += angle * Math.PI / 180;
            },
            move(distance: number) {
                this.pos.x += Math.cos(this.rad) * distance;
                this.pos.y += Math.sin(this.rad) * distance;
            },
            side(distance: number) {
                this.pos.x += Math.cos(this.rad + Math.PI/2) * distance;
                this.pos.y += Math.sin(this.rad + Math.PI/2) * distance;
            },
            getRay() {
                return {
                    intersect(entities: SimulatorEntity[]) {
                        // Mock implementation that always returns undefined (no obstacles)
                        return undefined;
                    }
                };
            }
        };

        return {
            robot,
            entities: [],
            timestamps: [],
            time: 0,
            size: { x: 1000, y: 1000 }
        };
    }

    // Create a new environment with the given parent
    private createEnvironment(parent: Environment): Environment {
        return { variables: new Map<string, any>(), parent };
    }

    // Look up a variable in the current environment chain
    private lookupVariable(name: string): any {
        let env: Environment | undefined = this.currentEnv;
        while (env) {
            if (env.variables.has(name)) {
                return env.variables.get(name);
            }
            env = env.parent;
        }
        throw new Error(`Variable '${name}' not found`);
    }

    // Store a variable in the current environment
    private storeVariable(name: string, value: any): void {
        this.currentEnv.variables.set(name, value);
    }

    // Helper method to cast AST types to visitor types to fix the "accept" issue
    private castDSLProgram(node: ast.DSLProgram): DSLProgram {
        return node as unknown as DSLProgram;
    }

    private castExpression(node: ast.Expression): Expression {
        return node as unknown as Expression;
    }

    private castStatement(node: ast.Statement): Statement {
        return node as unknown as Statement;
    }

    private castFunctionDef(node: ast.FunctionDef): FunctionDef {
        return node as unknown as FunctionDef;
    }

    private castBlock(node: ast.Block): Block {
        return node as unknown as Block;
    }

    // Record a timestamp in the simulator
    private recordTimestamp(): number {
        this.currentTime += 1;
        this.scene.timestamps.push({
            time: this.currentTime,
            pos: { ...this.scene.robot.pos },
            rad: this.scene.robot.rad,
            speed: this.scene.robot.speed
        });
        return this.currentTime;
    }

    visitAbstractVariableDecl(node: AbstractVariableDecl): any {
        // This is an abstract class, so we don't do anything here
        return undefined;
    }

    visitVariableDecl(node: VariableDecl): any {
        let value = undefined;
        if (node.expr) {
            value = this.visitExpression(this.castExpression(node.expr));
        }
        this.storeVariable(node.name, value);
        return value;
    }

    visitVariableFunDecl(node: VariableFunDecl): any {
        // Function parameters are handled when the function is called
        return undefined;
    }

    visitBlock(node: Block): any {
        // Execute each statement in the block
        const previousEnv = this.currentEnv;
        this.currentEnv = this.createEnvironment(previousEnv);

        for (const statement of node.statements) {
            this.visitStatement(this.castStatement(statement));
            // If we've got a return value, exit the block early
            if (this.returnValue !== undefined) {
                break;
            }
        }

        // Restore the previous environment
        this.currentEnv = previousEnv;
        return undefined;
    }

    visitDSLProgram(node: DSLProgram): any {
        // Register all functions
        for (const func of node.functions) {
            this.functions.set(func.name, this.castFunctionDef(func));
        }

        // Find the main function (if any) and execute it
        const mainFunc = this.functions.get('main');
        if (mainFunc) {
            return this.visitFunctionDef(mainFunc);
        }
        
        return undefined;
    }

    visitExpression(node: Expression): any {
        // Dispatch to the appropriate visitor method based on node type
        const nodeType = node.$type as string;
        switch (nodeType) {
            case 'BinaryOperation':
                return this.visitBinaryOperation(node as BinaryOperation);
            case 'BooleanExpr':
                return this.visitBooleanExpr(node as BooleanExpr);
            case 'BooleanLiteral':
                return this.visitBooleanLiteral(node as BooleanLiteral);
            case 'FunctionCall':
                return this.visitFunctionCall(node as FunctionCall);
            case 'LogicalExpr':
                return this.visitLogicalExpr(node as LogicalExpr);
            case 'NumberLiteral':
                return this.visitNumberLiteral(node as NumberLiteral);
            case 'ParenExpr':
                return this.visitParenExpr(node as ParenExpr);
            case 'UnitValue':
                return this.visitUnitValue(node as UnitValue);
            case 'Variable':
                return this.visitVariable(node as Variable);
            case 'Cast':
                // Handle Cast as a special case
                return this.visitCast(node as any);
            default:
                throw new Error(`Unknown expression type: ${nodeType}`);
        }
    }

    visitBinaryOperation(node: BinaryOperation): any {
        const left = this.visitExpression(this.castExpression(node.left));
        const right = this.visitExpression(this.castExpression(node.right));

        switch (node.operator) {
            case '+': return left + right;
            case '-': return left - right;
            case '*': return left * right;
            case '/': return left / right;
            case '%': return left % right;
            default: throw new Error(`Unknown operator: ${node.operator}`);
        }
    }

    visitBooleanExpr(node: BooleanExpr): any {
        const left = this.visitExpression(this.castExpression(node.left));
        const right = this.visitExpression(this.castExpression(node.right));

        switch (node.comparator) {
            case '<': return left < right;
            case '<=': return left <= right;
            case '>': return left > right;
            case '>=': return left >= right;
            case '==': return left === right;
            case '!=': return left !== right;
            default: throw new Error(`Unknown comparator: ${node.comparator}`);
        }
    }

    visitFunctionCall(node: FunctionCall): any {
        const func = this.functions.get(node.functioncall.ref?.name || '');
        if (!func) {
            throw new Error(`Function '${node.functioncall.ref?.name}' not found`);
        }

        // Evaluate arguments
        const args = node.args.map(arg => this.visitExpression(this.castExpression(arg)));

        // Create a new environment for the function call
        const previousEnv = this.currentEnv;
        this.currentEnv = this.createEnvironment(this.globalEnv);

        // Bind parameters to argument values
        func.params.forEach((param, index) => {
            this.storeVariable(param.name, args[index]);
        });

        // Reset return value
        this.returnValue = undefined;

        // Execute function body
        this.visitBlock(this.castBlock(func.block));

        // Restore environment
        this.currentEnv = previousEnv;

        // Return the function's return value
        const result = this.returnValue;
        this.returnValue = undefined;
        return result;
    }

    visitLiteral(node: Literal): any {
        if (node.$type === 'BooleanLiteral') {
            return this.visitBooleanLiteral(node as BooleanLiteral);
        } else if (node.$type === 'NumberLiteral') {
            return this.visitNumberLiteral(node as NumberLiteral);
        } else {
            throw new Error(`Unknown literal type: ${node.$type}`);
        }
    }

    visitBooleanLiteral(node: BooleanLiteral): any {
        return node.value;
    }

    visitNumberLiteral(node: NumberLiteral): any {
        let value = node.value;
        if (node.sign === '-') {
            value = -value;
        }
        return value;
    }

    visitLogicalExpr(node: LogicalExpr): any {
        const left = this.visitExpression(this.castExpression(node.left));
        
        // Short-circuit evaluation
        if (node.operator === 'and' && !left) {
            return false;
        }
        if (node.operator === 'or' && left) {
            return true;
        }
        
        const right = this.visitExpression(this.castExpression(node.right));
        
        if (node.operator === 'and') {
            return left && right;
        } else if (node.operator === 'or') {
            return left || right;
        } else {
            throw new Error(`Unknown logical operator: ${node.operator}`);
        }
    }

    visitParenExpr(node: ParenExpr): any {
        return this.visitExpression(this.castExpression(node.expr));
    }

    visitUnitValue(node: UnitValue): any {
        const value = this.visitExpression(this.castExpression(node.value));
        // Add unit to value
        return {
            value,
            unit: node.unit
        };
    }

    visitVariable(node: Variable): any {
        if (!node.ref || !node.ref.ref) {
            throw new Error('Variable reference is null');
        }
        return this.lookupVariable(node.ref.ref.name);
    }

    visitFunctionDef(node: FunctionDef): any {
        // Store the function definition
        this.functions.set(node.name, node);
        return undefined;
    }

    visitStatement(node: Statement): any {
        // Dispatch to the appropriate visitor method based on node type
        const nodeType = node.$type as string;
        switch (nodeType) {
            case 'VariableDecl':
                return this.visitVariableDecl(node as VariableDecl);
            case 'VariableAssign':
                return this.visitVariableAssign(node as VariableAssign);
            case 'Return':
                return this.visitReturn(node as Return);
            case 'Loop':
                return this.visitLoop(node as Loop);
            case 'FunctionCall':
                return this.visitFunctionCall(node as FunctionCall);
            case 'Clock':
                return this.visitClock(node as Clock);
            case 'Forward':
                return this.visitForward(node as Forward);
            case 'Movement':
                return this.visitMovement(node as Movement);
            case 'Rotation':
                return this.visitRotation(node as Rotation);
            case 'Speed':
                return this.visitSpeed(node as Speed);
            case 'Comment':
                return this.visitComment(node as Comment);
            case 'Cast':
                return this.visitCast(node as any);
            case 'Distance':
                // Handle Distance command
                return this.visitDistance(node as any);
            case 'Timestamp':
                // Handle Timestamp command
                return this.visitTimestamp(node as any);
            default:
                throw new Error(`Unknown statement type: ${nodeType}`);
        }
    }

    visitCast(node: any): any {
        const value = this.visitExpression(this.castExpression(node.value));
        // Perform type conversion as needed based on the target type
        switch (node.type) {
            case 'number':
                return Number(value);
            case 'boolean':
                return Boolean(value);
            case 'cm':
                // Convert mm to cm if the value has a unit
                if (typeof value === 'object' && value.unit === 'mm') {
                    return { value: value.value / 10, unit: 'cm' };
                }
                return { value: Number(value), unit: 'cm' };
            case 'mm':
                // Convert cm to mm if the value has a unit
                if (typeof value === 'object' && value.unit === 'cm') {
                    return { value: value.value * 10, unit: 'mm' };
                }
                return { value: Number(value), unit: 'mm' };
            default:
                throw new Error(`Unknown cast type: ${node.type}`);
        }
    }

    visitCommand(node: Command): any {
        // Base command - dispatch to specific command types
        const nodeType = node.$type as string;
        switch (nodeType) {
            case 'Clock':
                return this.visitClock(node as Clock);
            case 'Forward':
                return this.visitForward(node as Forward);
            case 'Movement':
                return this.visitMovement(node as Movement);
            case 'Rotation':
                return this.visitRotation(node as Rotation);
            case 'Speed':
                return this.visitSpeed(node as Speed);
            case 'Distance':
                // Handle Distance command
                return this.visitDistance(node as any);
            case 'Timestamp':
                // Handle Timestamp command
                return this.visitTimestamp(node as any);
            default:
                throw new Error(`Unknown command type: ${nodeType}`);
        }
    }

    visitClock(node: Clock): any {
        const angle = this.visitExpression(this.castExpression(node.angle));
        const sign = node.sign || '+';
        const finalAngle = sign === '-' ? -angle : angle;
        
        // Update the simulator
        this.scene.robot.turn(finalAngle);
        const timestamp = this.recordTimestamp();
        
        // Record the robot command
        this.commands.push({ type: 'turn', angle: finalAngle, timestamp });
        
        console.log(`[Robot] Clock ${sign}${angle} (turns by ${finalAngle} degrees)`);
        return undefined;
    }

    visitForward(node: Forward): any {
        // Convert to mm for the simulator
        let distance = node.distance;
        if (node.unit === 'cm') {
            distance *= 10; // Convert cm to mm
        }
        
        // Update the simulator
        this.scene.robot.move(distance);
        const timestamp = this.recordTimestamp();
        
        // Record the robot command
        this.commands.push({ 
            type: 'move', 
            distance: node.distance, 
            unit: node.unit,
            timestamp
        });
        
        console.log(`[Robot] Forward ${node.distance}${node.unit}`);
        return undefined;
    }

    visitMovement(node: Movement): any {
        const valueObj = this.visitExpression(this.castExpression(node.value));
        
        // Extract value and unit from the cast result
        let value = typeof valueObj === 'object' ? valueObj.value : valueObj;
        let unit = typeof valueObj === 'object' ? valueObj.unit : 'mm';
        
        // Convert to mm for the simulator if needed
        let distanceInMm = value;
        if (unit === 'cm') {
            distanceInMm = value * 10;
        }
        
        const timestamp = this.recordTimestamp();
        
        // Handle different directions
        switch (node.direction) {
            case 'Forward':
                this.scene.robot.move(distanceInMm);
                this.commands.push({ 
                    type: 'move', 
                    distance: value, 
                    unit, 
                    timestamp 
                });
                break;
            case 'Backward':
                this.scene.robot.move(-distanceInMm);
                this.commands.push({ 
                    type: 'move', 
                    distance: -value, 
                    unit, 
                    timestamp 
                });
                break;
            case 'Left':
                this.scene.robot.side(distanceInMm);
                this.commands.push({ 
                    type: 'side', 
                    distance: value, 
                    direction: 'left', 
                    timestamp 
                });
                break;
            case 'Right':
                this.scene.robot.side(-distanceInMm);
                this.commands.push({ 
                    type: 'side', 
                    distance: value, 
                    direction: 'right', 
                    timestamp 
                });
                break;
            default:
                throw new Error(`Unknown direction: ${node.direction}`);
        }
        
        console.log(`[Robot] ${node.direction} ${value}${unit}`);
        return undefined;
    }

    visitRotation(node: Rotation): any {
        const angle = this.visitExpression(this.castExpression(node.angle));
        
        // Update the simulator
        this.scene.robot.turn(angle);
        const timestamp = this.recordTimestamp();
        
        // Record the robot command
        this.commands.push({ type: 'turn', angle, timestamp });
        
        console.log(`[Robot] Rotate ${angle} degrees`);
        return undefined;
    }

    visitSpeed(node: Speed): any {
        const value = this.visitExpression(this.castExpression(node.value));
        
        // Update the simulator
        this.scene.robot.speed = value;
        const timestamp = this.recordTimestamp();
        
        // Record the robot command
        this.commands.push({ type: 'setSpeed', value, timestamp });
        
        console.log(`[Robot] Set speed to ${value}`);
        return undefined;
    }

    visitDistance(node: any): any {
        // Get the distance from the robot's ray
        const ray = this.scene.robot.getRay();
        const intersection = ray.intersect(this.scene.entities);
        
        if (intersection) {
            // Calculate distance using Pythagorean theorem
            const dx = this.scene.robot.pos.x - intersection.x;
            const dy = this.scene.robot.pos.y - intersection.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            console.log(`[Robot] Distance: ${distance}mm`);
            return distance;
        }
        
        console.log(`[Robot] No obstacle detected`);
        return Infinity;
    }

    visitTimestamp(node: any): any {
        return this.currentTime;
    }

    visitComment(node: Comment): any {
        // Comments don't affect execution
        return undefined;
    }

    visitLoop(node: Loop): any {
        while (this.visitExpression(this.castExpression(node.condition))) {
            this.visitBlock(this.castBlock(node.block));
            
            // If we've got a return value, exit the loop
            if (this.returnValue !== undefined) {
                break;
            }
        }
        return undefined;
    }

    visitReturn(node: Return): any {
        this.returnValue = this.visitExpression(this.castExpression(node.value));
        return this.returnValue;
    }

    visitVariableAssign(node: VariableAssign): any {
        if (!node.variable || !node.variable.ref) {
            throw new Error('Variable reference is null');
        }
        
        const value = this.visitExpression(this.castExpression(node.value));
        this.storeVariable(node.variable.ref.name, value);
        return value;
    }

    // Method to interpret a program
    interpret(program: ast.DSLProgram): InterpreterResult {
        // Reset state
        this.globalEnv = { variables: new Map<string, any>() };
        this.currentEnv = this.globalEnv;
        this.functions = new Map();
        this.returnValue = undefined;
        this.commands = [];
        this.scene = this.createMockScene();
        this.currentTime = 0;

        this.visitDSLProgram(this.castDSLProgram(program));
        
        // Return the recorded robot commands and timestamps
        return {
            commands: this.commands,
            timestamps: this.scene.timestamps
        };
    }
}