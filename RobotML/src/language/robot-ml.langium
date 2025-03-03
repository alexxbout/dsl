grammar RobotMl

entry DSLProgramRule:
    {DSLProgram} (functions+=FunctionRule)*;

FunctionRule:
    {FunctionDef} 'let' returnType=TypeRule name=ID '(' ')'
    block=BlockRule;

BlockRule:
    {Block} '{' (statements+=StatementRule)* '}';

StatementRule returns Statement:
    VariableAssignRule | VariableDeclRule | ReturnRule | LoopRule | CommandRule | FunctionCallRule;

ExpressionRule returns Expression:
    BooleanExprRule | ArithmeticExprRule | PrimaryExprRule;

PrimaryExprRule returns Expression:
    VariableRefRule | LiteralRule | FunctionCallRule;

BooleanExprRule returns Expression:
    {BooleanExpr} left=ArithmeticExprRule comparator=ComparatorRule right=ArithmeticExprRule;

ArithmeticExprRule returns Expression:
    {BinaryOperation} left=PrimaryExprRule operator=ArithmeticOpRule right=ExpressionRule | PrimaryExprRule;

VariableRefRule:
    {Variable} ref=[VariableDeclRule:ID];

LiteralRule:
    NumberLiteralRule | BooleanLiteralRule;

NumberLiteralRule:
    {NumberLiteral} (sign=SignRule)? value=INT;

BooleanLiteralRule:
    {BooleanLiteral} value?="value";

FunctionCallRule:
    {FunctionCall} function=[FunctionRule:ID] '(' (args+=FunctionArgRule (',' args+=FunctionArgRule)*)? ')'?;

FunctionArgRule returns Expression:
    {UnitValue} value=ExpressionRule 'in' unit=MovementUnitRule | ExpressionRule;

VariableAssignRule:
    {VariableAssign} name=ID '=' value=ExpressionRule;

VariableDeclRule:
    {VariableDecl} 'var' type=TypeRule name=ID ('=' expr=ExpressionRule)?;

ReturnRule:
    {Return} 'return' value=ExpressionRule;

LoopRule:
    {Loop} 'loop' condition=ExpressionRule block=BlockRule;

CommandRule:
    SpeedRule | RotationRule | MovementRule | ForwardRule | ClockRule;

ForwardRule:
    {Forward} 'Forward' distance=INT 'in' unit=MovementUnitRule;

ClockRule:
    {Clock} 'Clock' angle=INT;

SpeedRule:
    {Speed} 'setSpeed' '(' value=FunctionArgRule ')'?;

RotationRule:
    {Rotation} 'rotate' angle=ExpressionRule;

MovementRule:
    {Movement} 'move' value=ExpressionRule unit=MovementUnitRule direction=MovementDirRule;

SignRule returns string:
    '+' | '-';

ArithmeticOpRule returns string:
    '+' | '-' | '*' | '/' | '%';

ComparatorRule returns string:
    '<' | '<=' | '>' | '>=' | '=' | '!=';

TypeRule returns string:
    'cm' | 'mm' | 'number' | 'void' | 'boolean';

MovementDirRule returns string:
    'FORWARD' | 'BACKWARD' | 'LEFT' | 'RIGHT';

MovementUnitRule returns string:
    'mm' | 'cm';

terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
hidden terminal WS: /\s+/;
hidden terminal CR: /\r/;

interface DSLProgram {
    functions: FunctionDef[];
}

interface FunctionDef {
    name: string;
    returnType: string;
    block: Block;
}

interface Block {
    statements: Statement[];
}

interface Expression {
}

interface Statement {
}

interface Variable extends Expression {
    ref: @VariableDecl;
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
    function: @FunctionDef;
    args: Expression[];
}

interface VariableAssign extends Statement {
    name: string;
    value: Expression;
}

interface VariableDecl extends Statement {
    name: string;
    type: string;
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
    angle: number;
}

interface Speed extends Command {
    value: Expression;
}

interface Rotation extends Command {
    angle: Expression;
}

interface Movement extends Command {
    value: Expression;
    unit: string;
    direction: string;
}

interface Comment extends Statement {
    text: string[];
}