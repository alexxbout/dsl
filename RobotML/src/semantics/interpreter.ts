import {
    AbstractVariableDecl, BinaryOperation, Block, BooleanExpr, BooleanLiteral, Cast, Clock, Command, Comment, DSLProgram,
    Expression, Forward, FunctionCall, FunctionDef, Literal, LogicalExpr, Loop, Movement, NumberLiteral, ParenExpr, Return, RobotMlVisitor, Rotation, Speed, Statement, UnitValue, Variable, VariableAssign, VariableDecl, VariableFunDecl
} from './robot-ml-visitor.js';

export class RobotMLInterpreter implements RobotMlVisitor {
    visitAbstractVariableDecl(node: AbstractVariableDecl): any {}
    visitVariableDecl(node: VariableDecl): any {}
    visitVariableFunDecl(node: VariableFunDecl): any {}
    visitBlock(node: Block): any {}
    visitDSLProgram(node: DSLProgram): any {}
    visitExpression(node: Expression): any {}
    visitBinaryOperation(node: BinaryOperation): any {}
    visitBooleanExpr(node: BooleanExpr): any {}
    visitFunctionCall(node: FunctionCall): any {}
    visitLiteral(node: Literal): any {}
    visitBooleanLiteral(node: BooleanLiteral): any {}
    visitNumberLiteral(node: NumberLiteral): any {}
    visitLogicalExpr(node: LogicalExpr): any {}
    visitParenExpr(node: ParenExpr): any {}
    visitUnitValue(node: UnitValue): any {}
    visitVariable(node: Variable): any {}
    visitFunctionDef(node: FunctionDef): any {}
    visitStatement(node: Statement): any {}
    visitCast(node: Cast): any {}
    visitCommand(node: Command): any {}
    visitClock(node: Clock): any {}
    visitForward(node: Forward): any {}
    visitMovement(node: Movement): any {}
    visitRotation(node: Rotation): any {}
    visitSpeed(node: Speed): any {}
    visitComment(node: Comment): any {}
    visitLoop(node: Loop): any {}
    visitReturn(node: Return): any {}
    visitVariableAssign(node: VariableAssign): any {}
}