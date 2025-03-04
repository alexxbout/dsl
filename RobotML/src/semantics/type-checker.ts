import { RobotMlValidationVisitor } from "../language/robot-ml-visitor.js";

export class RobotMlTypeChecker extends RobotMlValidationVisitor {

    visitAbstractVariableDecl() {}
    visitVariableDecl() {}
    visitVariableFunDecl() {}
    visitBlock() {}
    visitDSLProgram() {}
    visitExpression() {}
    visitBinaryOperation() {}
    visitBooleanExpr() {}
    visitFunctionCall() {}
    visitLiteral() {}
    visitBooleanLiteral() {}
    visitNumberLiteral() {}
    visitLogicalExpr() {}
    visitParenExpr() {}
    visitUnitValue() {}
    visitVariable() {}
    visitFunctionDef() {}
    visitStatement() {}
    visitCast() {}
    visitCommand() {}
    visitClock() {}
    visitForward() {}
    visitMovement() {}
    visitRotation() {}
    visitSpeed() {}
    visitComment() {}
    visitLoop() {}
    visitReturn() {}
    visitVariableAssign() {}
}