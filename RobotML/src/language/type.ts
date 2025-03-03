// Type definitions for RobotML language based on the model diagram

// Enums
export enum Operator {
    AND = 'and',
    OR = 'or'
}

export enum Type {
    CM = 'cm',
    MM = 'mm',
    NUMBER = 'number',
    VOID = 'void',
    BOOLEAN = 'boolean'
}

export enum MovementDirection {
    FORWARD = 'FORWARD',
    BACKWARD = 'BACKWARD',
    LEFT = 'LEFT',
    RIGHT = 'RIGHT'
}

export enum MovementUnit {
	MM = 'mm',
	CM = 'cm'
}

// Interfaces for the model
export interface DSLProgram {
    functions: Function[];
}

export interface Function {
    name: string;
    returnType: Type;
    block: Block;
}

export interface Block {
    statements: Statement[];
}

// Base interfaces
export interface Expression {
    // Base interface for all expressions
}

export interface Statement {
    // Base interface for all statements
}

// Expression implementations
export interface Variable extends Expression {
    name: string;
}

export interface Literal extends Expression {
    // Base interface for literals
}

export interface NumberLiteral extends Literal {
    value: number;
}

export interface BooleanLiteral extends Literal {
    value: boolean;
}

export interface BinaryOperation extends Expression {
    left: Expression;
    operator: Operator;
    right: Expression;
}

export interface FunctionCall extends Expression {
    name: string;
    args: Expression[];
}

// Statement implementations
export interface VariableAssign extends Statement {
    name: string;
    value: Expression;
}

export interface VariableDecl extends Statement {
    name: string;
    type: Type;
    expr?: Expression;
}

export interface Return extends Statement {
    value: Expression;
}

export interface Loop extends Statement {
    condition: Expression;
    block: Block;
}

// Command implementations
export interface Command extends Statement {
    // Base interface for commands
}

export interface Speed extends Command {
    value: Expression;
    unit: Type;
}

export interface Rotation extends Command {
    angle: Expression;
}

export interface Movement extends Command {
    value: Expression;
    unit: MovementUnit;
    direction: MovementDirection;
}
