grammar RobotMl

entry DSLProgramRule:
    {DSLProgram} (functions+=FunctionRule)*;

FunctionRule:
    {FunctionDef} 'let' returnType=(TypeRule | 'void') name=ID '(' (params+=ParamFunRule (',' params+=ParamFunRule)*)? ')'
    block=BlockRule;

ParamFunRule:
    {VariableFunDecl} type=TypeRule name=ID ;

BlockRule:
    {Block} '{' (statements+=StatementRule)* '}';

StatementRule returns Statement:
    VariableAssignRule | VariableDeclRule | ReturnRule | LoopRule | CommandRule | FunctionCallRule | IfRule | BlockRule;

ExpressionRule returns Expression:
    LogicalExprRule | CastRule;

PrimaryExprRule returns Expression:
    VariableRefRule | LiteralRule | FunctionCallRule | ParenExprRule;

BooleanExprRule returns Expression:
    {BooleanExpr} left=ArithmeticExprRule comparator=ComparatorRule right=ArithmeticExprRule | ArithmeticExprRule;

ArithmeticExprRule returns Expression:
    {BinaryOperation} left=PrimaryExprRule operator=ArithmeticOpRule right=ExpressionRule | PrimaryExprRule;

VariableRefRule:
    {Variable} ref=[AbstractVariableDecl:ID];

LiteralRule:
    NumberLiteralRule | BooleanLiteralRule;

NumberLiteralRule:
    {NumberLiteral} (sign=SignRule)? value=INT;

BooleanLiteralRule:
    {BooleanLiteral} value=BooleanRule;

FunctionCallRule:
    {FunctionCall} functioncall=[FunctionRule:ID] '(' (args+=ExpressionRule (',' args+=ExpressionRule)*)? ')';

VariableAssignRule:
    {VariableAssign} variable=[AbstractVariableDecl:ID] '=' value=ExpressionRule;

VariableDeclRule:
    {VariableDecl} 'var' type=TypeRule name=ID ('=' expr=ExpressionRule)?;

ReturnRule:
    {Return} 'return' value=ExpressionRule;

LoopRule:
    {Loop} 'loop' condition=ExpressionRule block=BlockRule;

IfRule:
    {IfStatement} 'if' '(' condition=ExpressionRule ')' thenBlock=BlockRule ('else' elseBlock=BlockRule)?;

CommandRule:
    SpeedRule | ClockRule | MovementRule | DistanceRule;

MovementRule returns Movement:
    {Movement} direction=DirectionRule value=ExpressionRule;

ClockRule:
    {Clock} 'Clock' sign=SignRule? angle=ExpressionRule;

SpeedRule:
    {Speed} 'setSpeed' '(' value=ExpressionRule ')'?;

DistanceRule:
    {Distance} 'getDistance()';

TimestampRule:
    {Timestamp} 'getTimestamp()';

SignRule returns string:
    '+' | '-';

CastRule returns Cast:
    {Cast} value=(ArithmeticExprRule | PrimaryExprRule) 'in' type=TypeRule;

ArithmeticOpRule returns string:
    '+' | '-' | '*' | '/' | '%';

ComparatorRule returns string:
    '<' | '<=' | '>' | '>=' | '==' | '!=';

TypeRule returns string:
    'cm' | 'mm' | 'number' | 'boolean';

DirectionRule returns string:
    'Forward' | 'Backward' | 'Left' | 'Right';

BooleanRule returns boolean:
    'true' | 'false';

LogicalExprRule returns Expression:
    {LogicalExpr} left=BooleanExprRule operator=LogicalOpRule right=LogicalExprRule | BooleanExprRule;

LogicalOpRule returns string:
    'and' | 'or';

ParenExprRule:
    {ParenExpr} '(' expr=ExpressionRule ')';

terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
hidden terminal WS: /\s+/;
hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;

interface DSLProgram {
    functions: FunctionDef[];
}

interface FunctionDef {
    name: string;
    returnType: string;
    block: Block;
    params: VariableFunDecl[];
}

interface Block {
    statements: Statement[];
}

interface Expression {
}

interface Statement {
}

interface AbstractVariableDecl {
    name: string;
    type: string;
}

interface Variable extends Expression {
    ref: @AbstractVariableDecl;
}

interface ParenExpr extends Expression {
    expr: Expression;
}

interface Literal extends Expression {
}

interface NumberLiteral extends Literal {
    value: number;
    sign?: string;
}

interface BooleanLiteral extends Literal {
    value: boolean;
}

interface BooleanExpr extends Expression {
    left: Expression;
    comparator: string;
    right: Expression;
}

interface BinaryOperation extends Expression {
    left: Expression;
    operator: string;
    right: Expression;
}

interface UnitValue extends Expression {
    value: Expression;
    unit: string;
}

interface FunctionCall extends Expression, Statement {
    functioncall: @FunctionDef;
    args: Expression[];
}

interface VariableAssign extends Statement {
    variable: @AbstractVariableDecl;
    value: Expression;
}

interface VariableDecl extends Statement, AbstractVariableDecl {
    expr?: Expression;
}

interface Return extends Statement {
    value: Expression;
}

interface Loop extends Statement {
    condition: Expression;
    block: Block;
}

interface Command extends Statement {
}

interface Forward extends Command {
    distance: number;
    unit: string;
}

interface Clock extends Command {
    angle: Expression;
    sign?: string;
}

interface Speed extends Command {
    value: Expression;
}

interface Distance extends Command {}

interface Timestamp extends Command {}

interface Rotation extends Command {
    angle: Expression;
}

interface Movement extends Command {
    value: Expression;
    direction: string;
}

interface Comment extends Statement {
    text: string[];
}

interface VariableFunDecl extends Statement, AbstractVariableDecl {
}

interface Cast extends Statement {
    value: Expression;
    type: string;
}

interface LogicalExpr extends Expression {
    left: Expression;
    operator: string;
    right: Expression;
}

interface IfStatement extends Statement {
    condition: Expression;
    thenBlock: Block;
    elseBlock?: Block;
}