import * as ast from "../language/generated/ast.js";
import { AbstractVariableDecl, BinaryOperation, Block, BooleanExpr, BooleanLiteral, Clock, Command, Comment, DSLProgram, Expression, Forward, FunctionCall, FunctionDef, Literal, LogicalExpr, Loop, Movement, NumberLiteral, ParenExpr, Return, RobotMlVisitor, Rotation, Speed, Statement, UnitValue, Variable, VariableAssign, VariableDecl, VariableFunDecl } from "../language/robot-ml-visitor.js";
import * as Entities from "../web/simulator/entities.js";

// Create Scope and state objects for the interpreter
interface Scope {
    variables: Map<string, any>;
    parent?: Scope;
}

// Result of the interpreter, tracking robot commands for display/simulation
export interface InterpreterResult {
    commands: RobotCommand[];
    timestamps: Array<Entities.Timestamp>;
}

// Types of robot commands that can be executed
export type RobotCommand = 
    | { type: 'turn'; angle: number; timestamp: number }
    | { type: 'move'; distance: number; unit: string; direction: 'forward' | 'backward' | 'left' | 'right'; timestamp: number }
    | { type: 'setSpeed'; value: number; timestamp: number };

export class RobotMLInterpreter implements RobotMlVisitor {
    // Global Scope for variables and functions
    private globalEnv: Scope = { variables: new Map<string, any>() };
    private currentEnv: Scope;
    private functions: Map<string, FunctionDef> = new Map();
    private returnValue: any = undefined;
    
    // Track robot commands and simulator state
    private commands: RobotCommand[] = [];
    private currentTime: number = 0;
    
    constructor() {
        this.currentEnv = this.globalEnv;
    }    

    // Create a new Scope with the given parent
    private createScope(parent: Scope): Scope {
        return { variables: new Map<string, any>(), parent };
    }

    // Look up a variable in the current Scope chain
    private lookupVariable(name: string): any {
        let env: Scope | undefined = this.currentEnv;
        while (env) {
            if (env.variables.has(name)) {
                return env.variables.get(name);
            }
            env = env.parent;
        }
        throw new Error(`Variable '${name}' not found`);
    }

    // Store a variable in the current Scope
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

    // Record a timestamp
    private recordTimestamp(): number {
        this.currentTime += 1;
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
        console.log("visitBlock - Nombre d'instructions:", node.statements.length);
        
        // Execute each statement in the block
        const previousEnv = this.currentEnv;
        this.currentEnv = this.createScope(previousEnv);

        for (let i = 0; i < node.statements.length; i++) {
            const statement = node.statements[i];
            console.log(`Exécution de l'instruction ${i+1}/${node.statements.length}, type: ${statement.$type}`);
            this.visitStatement(this.castStatement(statement));
            // If we've got a return value, exit the block early
            if (this.returnValue !== undefined) {
                break;
            }
        }

        // Restore the previous Scope
        this.currentEnv = previousEnv;
        return undefined;
    }

    visitDSLProgram(node: DSLProgram): any {
        console.log("visitDSLProgram - Fonctions trouvées:", node.functions.length);
        
        // Register all functions
        for (const func of node.functions) {
            console.log("Enregistrement de la fonction:", func.name);
            this.functions.set(func.name, this.castFunctionDef(func));
        }

        // Find the main function (if any) and execute it
        const mainFunc = this.functions.get('main');
        if (mainFunc) {
            console.log("Fonction main trouvée, exécution...");
            return this.visitFunctionDef(mainFunc);
        } else {
            console.log("Fonction main non trouvée!");
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

        // Create a new Scope for the function call
        const previousEnv = this.currentEnv;
        this.currentEnv = this.createScope(this.globalEnv);

        // Bind parameters to argument values
        func.params.forEach((param, index) => {
            this.storeVariable(param.name, args[index]);
        });

        // Reset return value
        this.returnValue = undefined;

        // Execute function body
        this.visitBlock(this.castBlock(func.block));

        // Restore Scope
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
        console.log("visitFunctionDef:", node.name, "avec", node.block.statements.length, "instructions");
        
        // Si c'est la fonction main, exécuter son bloc
        if (node.name === 'main') {
            return this.visitBlock(this.castBlock(node.block));
        }
        
        // Store the function definition
        this.functions.set(node.name, node);
        return undefined;
    }

    visitStatement(node: Statement): any {
        // Dispatch to the appropriate visitor method based on node type
        const nodeType = node.$type as string;
        console.log("visitStatement - Type:", nodeType);
        
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
                console.error(`Type d'instruction inconnu: ${nodeType}`);
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
        
        // Générer un timestamp pour la commande
        const timestamp = this.recordTimestamp();
        
        // Enregistrer la commande robot
        this.commands.push({ type: 'turn', angle: finalAngle, timestamp });
        
        console.log(`[Robot] Clock ${sign}${angle} (tourne de ${finalAngle} degrés)`);
        return undefined;
    }

    visitForward(node: Forward): any {
        console.log("visitForward - distance:", node.distance, "unit:", node.unit);
        
        // Extraire la distance et l'unité
        const distance = node.distance;
        const unit = node.unit;
        
        // Générer un timestamp pour la commande
        const timestamp = this.recordTimestamp();
        
        // Enregistrer la commande robot
        this.commands.push({ 
            type: 'move', 
            distance, 
            unit,
            direction: 'forward',
            timestamp
        });
        
        console.log(`[Robot] Forward ${distance}${unit} - Commande ajoutée, total: ${this.commands.length}`);
        return undefined;
    }

    visitMovement(node: Movement): any {
        const valueObj = this.visitExpression(this.castExpression(node.value));
        
        // Extraire la valeur et l'unité du résultat
        let value = typeof valueObj === 'object' ? valueObj.value : valueObj;
        let unit = typeof valueObj === 'object' ? valueObj.unit : 'mm';
        
        // Générer un timestamp pour la commande
        const timestamp = this.recordTimestamp();
        
        // Enregistrer la commande robot selon la direction
        switch (node.direction) {
            case 'Forward':
                this.commands.push({ 
                    type: 'move', 
                    distance: value, 
                    unit, 
                    direction: 'forward',
                    timestamp 
                });
                break;
            case 'Backward':
                this.commands.push({ 
                    type: 'move', 
                    distance: -value, 
                    unit, 
                    direction: 'backward',
                    timestamp 
                });
                break;
            case 'Left':
                this.commands.push({ 
                    type: 'move', 
                    distance: value, 
                    unit, 
                    direction: 'left',
                    timestamp 
                });
                break;
            case 'Right':
                this.commands.push({ 
                    type: 'move', 
                    distance: value, 
                    unit, 
                    direction: 'right',
                    timestamp 
                });
                break;
            default:
                throw new Error(`Direction inconnue: ${node.direction}`);
        }
        
        console.log(`[Robot] ${node.direction} ${value}${unit}`);
        return undefined;
    }

    visitRotation(node: Rotation): any {
        const angle = this.visitExpression(this.castExpression(node.angle));
        
        // Générer un timestamp pour la commande
        const timestamp = this.recordTimestamp();
        
        // Enregistrer la commande robot
        const command: RobotCommand = { 
            type: 'turn' as const, 
            angle,
            timestamp
        };
        console.log('💾 Enregistrement de la commande:', command);
        this.commands.push(command);
        
        return undefined;
    }

    visitSpeed(node: Speed): any {
        const value = this.visitExpression(this.castExpression(node.value));
        
        // Générer un timestamp pour la commande
        const timestamp = this.recordTimestamp();
        
        // Enregistrer la commande robot
        this.commands.push({ type: 'setSpeed', value, timestamp });
        
        console.log(`[Robot] Définit la vitesse à ${value}`);
        return undefined;
    }

    visitDistance(node: any): any {
        // Extraire la valeur de distance
        const value = this.visitExpression(this.castExpression(node.value));
        
        // Générer un timestamp pour la commande
        const timestamp = this.recordTimestamp();
        
        // Enregistrer une commande de type "distance" (pour la compatibilité)
        console.log(`[Robot] Distance command with value ${value}`);
        
        // Retourner la valeur de distance
        return value;
    }

    visitTimestamp(node: any): any {
        // Enregistrer le temps actuel
        console.log(`[Robot] Current timestamp: ${this.currentTime}`);
        
        // Retourner le temps actuel
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
        console.log("Début de l'interprétation du programme");
        this.debugAST(program);
        
        // Reset state
        this.globalEnv = { variables: new Map<string, any>() };
        this.currentEnv = this.globalEnv;
        this.functions = new Map();
        this.returnValue = undefined;
        this.commands = [];
        this.currentTime = 0;

        // Visiter l'AST pour générer les commandes
        this.visitDSLProgram(this.castDSLProgram(program));
        
        console.log("Fin de l'interprétation, commandes générées:", this.commands.length);
        
        // Retourner les commandes générées
        return {
            commands: this.commands,
            timestamps: [] // Pas de timestamps générés par l'interpréteur
        };
    }
    
    // Méthode pour déboguer l'AST
    private debugAST(program: ast.DSLProgram): void {
        console.log("Débogage de l'AST:");
        console.log("- Type du programme:", program.$type);
        console.log("- Nombre de fonctions:", program.functions?.length || 0);
        
        if (program.functions && program.functions.length > 0) {
            program.functions.forEach((func, index) => {
                console.log(`- Fonction ${index + 1}:`, func.name);
                console.log(`  - Type:`, func.$type);
                console.log(`  - Nombre de paramètres:`, func.params?.length || 0);
                
                if (func.block && func.block.statements) {
                    console.log(`  - Nombre d'instructions:`, func.block.statements.length);
                    
                    func.block.statements.forEach((stmt, stmtIndex) => {
                        console.log(`    - Instruction ${stmtIndex + 1}:`, stmt.$type);
                        
                        // Afficher plus de détails pour les instructions Forward
                        if (stmt.$type === 'Forward') {
                            const forward = stmt as any;
                            console.log(`      - Distance:`, forward.distance);
                            console.log(`      - Unité:`, forward.unit);
                        }
                    });
                }
            });
        }
    }
}