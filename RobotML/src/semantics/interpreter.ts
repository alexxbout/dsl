import * as ast from "../language/generated/ast.js";
import { AbstractVariableDecl, BinaryOperation, Block, BooleanExpr, BooleanLiteral, Cast, Clock, Command, Comment, DSLProgram, Expression, Forward, FunctionCall, FunctionDef, Literal, LogicalExpr, Loop, Movement, NumberLiteral, ParenExpr, Return, RobotMlVisitor, Rotation, Speed, Statement, UnitValue, Variable, VariableAssign, VariableDecl, VariableFunDecl } from "../language/robot-ml-visitor.js";

// Create environment and state objects for the interpreter
interface Environment {
    variables: Map<string, any>;
    parent?: Environment;
}

// Result of the interpreter, tracking robot commands for display/simulation
export interface InterpreterResult {
    commands: RobotCommand[];
}

// Types of robot commands that can be executed
export type RobotCommand = 
    | { type: 'turn'; angle: number }
    | { type: 'move'; distance: number; unit: string }
    | { type: 'side'; distance: number; direction: 'left' | 'right' }
    | { type: 'setSpeed'; value: number };

export class RobotMLInterpreter implements RobotMlVisitor {
    // Global environment for variables and functions
    private globalEnv: Environment = { variables: new Map<string, any>() };
    private currentEnv: Environment;
    private functions: Map<string, FunctionDef> = new Map();
    private returnValue: any = undefined;
    
    // Track robot commands
    private commands: RobotCommand[] = [];
    
    constructor() {
        this.currentEnv = this.globalEnv;
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
        if (node.$type === 'BinaryOperation') {
            return this.visitBinaryOperation(node as BinaryOperation);
        } else if (node.$type === 'BooleanExpr') {
            return this.visitBooleanExpr(node as BooleanExpr);
        } else if (node.$type === 'BooleanLiteral') {
            return this.visitBooleanLiteral(node as BooleanLiteral);
        } else if (node.$type === 'FunctionCall') {
            return this.visitFunctionCall(node as FunctionCall);
        } else if (node.$type === 'LogicalExpr') {
            return this.visitLogicalExpr(node as LogicalExpr);
        } else if (node.$type === 'NumberLiteral') {
            return this.visitNumberLiteral(node as NumberLiteral);
        } else if (node.$type === 'ParenExpr') {
            return this.visitParenExpr(node as ParenExpr);
        } else if (node.$type === 'UnitValue') {
            return this.visitUnitValue(node as UnitValue);
        } else if (node.$type === 'Variable') {
            return this.visitVariable(node as Variable);
        } else {
            throw new Error(`Unknown expression type: ${node.$type}`);
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
        const func = this.functions.get(node.func.ref?.name || '');
        if (!func) {
            throw new Error(`Function '${node.func.ref?.name}' not found`);
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
        if (node.$type === 'VariableDecl') {
            return this.visitVariableDecl(node as VariableDecl);
        } else if (node.$type === 'VariableAssign') {
            return this.visitVariableAssign(node as VariableAssign);
        } else if (node.$type === 'Return') {
            return this.visitReturn(node as Return);
        } else if (node.$type === 'Loop') {
            return this.visitLoop(node as Loop);
        } else if (node.$type === 'FunctionCall') {
            return this.visitFunctionCall(node as FunctionCall);
        } else if (node.$type === 'Clock') {
            return this.visitClock(node as Clock);
        } else if (node.$type === 'Forward') {
            return this.visitForward(node as Forward);
        } else if (node.$type === 'Movement') {
            return this.visitMovement(node as Movement);
        } else if (node.$type === 'Rotation') {
            return this.visitRotation(node as Rotation);
        } else if (node.$type === 'Speed') {
            return this.visitSpeed(node as Speed);
        } else if (node.$type === 'Comment') {
            return this.visitComment(node as Comment);
        } else if (node.$type === 'Cast') {
            return this.visitCast(node as Cast);
        } else {
            throw new Error(`Unknown statement type: ${node.$type}`);
        }
    }

    visitCast(node: Cast): any {
        const value = this.visitExpression(this.castExpression(node.value));
        // Perform type conversion as needed based on the target type
        switch (node.type) {
            case 'number':
                return Number(value);
            case 'boolean':
                return Boolean(value);
            case 'cm':
            case 'mm':
                // Assuming unit conversion logic here
                return { value: Number(value), unit: node.type };
            default:
                throw new Error(`Unknown cast type: ${node.type}`);
        }
    }

    visitCommand(node: Command): any {
        // Base command - dispatch to specific command types
        if (node.$type === 'Clock') {
            return this.visitClock(node as Clock);
        } else if (node.$type === 'Forward') {
            return this.visitForward(node as Forward);
        } else if (node.$type === 'Movement') {
            return this.visitMovement(node as Movement);
        } else if (node.$type === 'Rotation') {
            return this.visitRotation(node as Rotation);
        } else if (node.$type === 'Speed') {
            return this.visitSpeed(node as Speed);
        } else {
            throw new Error(`Unknown command type: ${node.$type}`);
        }
    }

    visitClock(node: Clock): any {
        const angle = this.visitExpression(this.castExpression(node.angle));
        const sign = node.sign || '+';
        const finalAngle = sign === '-' ? -angle : angle;
        
        // Record the robot command
        this.commands.push({ type: 'turn', angle: finalAngle });
        
        console.log(`[Robot] Clock ${sign}${angle} (turns by ${finalAngle} degrees)`);
        return undefined;
    }

    visitForward(node: Forward): any {
        // Record the robot command
        this.commands.push({ 
            type: 'move', 
            distance: node.distance, 
            unit: node.unit 
        });
        
        console.log(`[Robot] Forward ${node.distance}${node.unit}`);
        return undefined;
    }

    visitMovement(node: Movement): any {
        const value = this.visitExpression(this.castExpression(node.value));
        
        // Handle different directions
        switch (node.direction) {
            case 'Forward':
                this.commands.push({ type: 'move', distance: value, unit: 'mm' });
                break;
            case 'Backward':
                this.commands.push({ type: 'move', distance: -value, unit: 'mm' });
                break;
            case 'Left':
                this.commands.push({ type: 'side', distance: value, direction: 'left' });
                break;
            case 'Right':
                this.commands.push({ type: 'side', distance: value, direction: 'right' });
                break;
            default:
                throw new Error(`Unknown direction: ${node.direction}`);
        }
        
        console.log(`[Robot] ${node.direction} ${value}`);
        return undefined;
    }

    visitRotation(node: Rotation): any {
        const angle = this.visitExpression(this.castExpression(node.angle));
        
        // Record the robot command
        this.commands.push({ type: 'turn', angle });
        
        console.log(`[Robot] Rotate ${angle} degrees`);
        return undefined;
    }

    visitSpeed(node: Speed): any {
        const value = this.visitExpression(this.castExpression(node.value));
        
        // Record the robot command
        this.commands.push({ type: 'setSpeed', value });
        
        console.log(`[Robot] Set speed to ${value}`);
        return undefined;
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

        this.visitDSLProgram(this.castDSLProgram(program));
        
        // Return the recorded robot commands
        return {
            commands: this.commands
        };
    }
}