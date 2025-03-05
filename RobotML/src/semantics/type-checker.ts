import * as ast from "../language/generated/ast.js";
import { AbstractVariableDecl, RobotMlValidationVisitor } from "../language/robot-ml-visitor.js";

/**
 * Symbol information for variables and functions
 */
interface Symbol {
    name: string;
    type: string;
    node: ast.AbstractVariableDecl;
    scope: number;
}

/**
 * Type checker for RobotML.
 * 
 * This visitor runs after the parsing phase and checks for type errors.
 */
export class RobotMlTypeChecker extends RobotMlValidationVisitor {
    // Symbol table to track variables by scope
    private symbolTable: Map<string, Symbol> = new Map();
    private currentScope: number = 0;

    // Define valid unit types
    private unitTypes = ['cm', 'mm'];

    /**
     * Check if a type is a unit type
     */
    private isUnitType(type: string): boolean {
        return this.unitTypes.includes(type);
    }

    visitDSLProgram(node: ast.DSLProgram): void {
        // Reset symbol table at the start of program validation
        this.symbolTable.clear();
        this.currentScope = 0;
        
        if (!node.functions || node.functions.length === 0) {
            this.validationAccept('warning', 'Program has no functions defined', { node });
            return;
        }
        
        // Check if there's an entry point
        const entryPoint = node.functions.find(f => f.name === 'main');
        if (!entryPoint) {
            this.validationAccept('warning', 'Program has no entry point function named "main"', { node });
        }
        
        // Process all functions
        for (const func of node.functions) {
            this.visitFunctionDef(func);
        }
    }
    
    visitFunctionDef(node: ast.FunctionDef): void {
        // Each function creates a new scope
        this.enterScope();
        
        // Register function parameters in the current scope
        if (node.params) {
            for (const param of node.params) {
                this.declareVariable(param);
            }
        }
        
        // For non-void functions, check return statements
        if (node.returnType !== 'void') {
            // Check if the function has at least one return statement
            const hasReturn = this.checkFunctionHasReturn(node);
            if (!hasReturn) {
                this.validationAccept('error', `Function "${node.name}" has return type "${node.returnType}" but no return statement`, { 
                    node, 
                    property: 'name' 
                });
            }
        }
        
        // Visit function body
        if (node.block) {
            this.visitBlock(node.block);
        }
        
        // Exit the function scope
        this.exitScope();
    }
    
    /**
     * Check if the function has at least one return statement
     */
    private checkFunctionHasReturn(func: ast.FunctionDef): boolean {
        if (!func.block || !func.block.statements) return false;
        
        // Simple check: does the function have at least one return statement?
        return func.block.statements.some(stmt => {
            // Direct return statement
            if (stmt.$type === 'Return') {
                return true;
            }
            
            // Return in a loop
            if (stmt.$type === 'Loop' && 'block' in stmt) {
                const loopBlock = stmt.block;
                if (ast.isBlock(loopBlock)) {
                    return this.blockHasReturn(loopBlock);
                }
            }
            
            return false;
        });
    }
    
    visitVariableDecl(node: ast.VariableDecl): void {
        // Add to symbol table first so expressions can reference this variable
        this.declareVariable(node);
        
        // Check initialization expression if present
        if (node.expr) {
            // Visit the expression first
            this.visitExpression(node.expr);
            
            // Then check type compatibility
            this.checkAssignmentTypeCompatibility(node.type, node.expr, node);
        }
    }
    
    visitVariableAssign(node: ast.VariableAssign): void {
        // Check if variable exists
        if (node.variable && node.variable.ref) {
            // Get the variable type using the reference
            let varType = 'unknown';
            
            // Check if the variable was explicitly declared in our scope
            const refName = node.variable.$refText || '';
            const symbol = this.findVariable(refName);
            
            if (symbol) {
                varType = symbol.type;
            } else if (ast.isAbstractVariableDecl(node.variable.ref)) {
                // Fallback to reference type if not found in our symbol table
                varType = node.variable.ref.type;
            }
            
            // Check type compatibility
            this.checkAssignmentTypeCompatibility(varType, node.value, node);
            
            // Visit value expression
            this.visitExpression(node.value);
        }
    }
    
    visitBinaryOperation(node: ast.BinaryOperation): void {
        // Ensure both operands are numeric
        if (node.left) {
            this.checkNumericExpression(node.left, 'Left operand of binary operation must be numeric', node);
            this.visitExpression(node.left);
        }
        
        if (node.right) {
            this.checkNumericExpression(node.right, 'Right operand of binary operation must be numeric', node);
            this.visitExpression(node.right);
        }
        
        // Check for division by zero
        if (node.operator === '/' && this.isZeroLiteral(node.right)) {
            this.validationAccept('error', 'Division by zero', { node, property: 'right' });
        }
    }
    
    visitLogicalExpr(node: ast.LogicalExpr): void {
        // Ensure both operands are boolean
        if (node.left) {
            const leftType = this.getExpressionType(node.left);
            if (leftType !== 'boolean') {
                this.validationAccept('error', `Left operand of logical expression must be boolean, got "${leftType}"`, {
                    node,
                    property: 'left'
                });
            }
            this.visitExpression(node.left);
        }
        
        if (node.right) {
            const rightType = this.getExpressionType(node.right);
            if (rightType !== 'boolean') {
                this.validationAccept('error', `Right operand of logical expression must be boolean, got "${rightType}"`, {
                    node,
                    property: 'right'
                });
            }
            this.visitExpression(node.right);
        }
    }
    
    visitBooleanExpr(node: ast.BooleanExpr): void {
        // If this is a comparison, check that both sides are compatible
        if (node.comparator && node.left && node.right) {
            const leftType = this.getExpressionType(node.left);
            const rightType = this.getExpressionType(node.right);
            
            // Boolean comparisons are only valid with == and != operators
            if (leftType === 'boolean' && rightType === 'boolean' && 
                !['==', '!='].includes(node.comparator)) {
                this.validationAccept('error', `Cannot use '${node.comparator}' operator with boolean values`, { node });
            } else if (!this.areTypesCompatible(leftType, rightType)) {
                this.validationAccept('error', `Cannot compare incompatible types "${leftType}" and "${rightType}"`, { node });
            }
            
            // Visit sub-expressions
            this.visitExpression(node.left);
            this.visitExpression(node.right);
        }
    }
    
    visitLoop(node: ast.Loop): void {
        // Check that condition is boolean
        if (node.condition) {
            this.checkBooleanExpression(node.condition, 'Loop condition must be boolean', node);
            this.visitExpression(node.condition);
        }
        
        // Visit the loop body
        if ('block' in node && node.block && ast.isBlock(node.block)) {
            // Create a new scope for the loop body
            this.enterScope();
            this.visitBlock(node.block);
            this.exitScope();
        }
    }
    
    visitCast(node: ast.Cast): void {
        // Check that the cast type is valid
        if (!['cm', 'mm', 'number', 'boolean'].includes(node.type)) {
            this.validationAccept('error', `Invalid cast type "${node.type}"`, { node, property: 'type' });
            return;
        }
        
        const valueType = this.getExpressionType(node.value);
        
        // Check for incompatible casts
        if (valueType === 'boolean' && (node.type === 'number' || node.type === 'cm' || node.type === 'mm')) {
            this.validationAccept('error', `Cannot cast boolean to "${node.type}"`, { node });
        }
        
        if ((valueType === 'number' || valueType === 'cm' || valueType === 'mm') && node.type === 'boolean') {
            this.validationAccept('error', `Cannot cast "${valueType}" to boolean`, { node });
        }
        
        // Visit the value expression
        this.visitExpression(node.value);
    }
    
    visitMovement(node: ast.Movement): void {
        // Check that value is numeric
        if (node.value) {
            this.checkNumericExpression(node.value, 'Movement value must be numeric', node);
            
            // Recommend unit casting - use a more robust check
            const valueType = this.getExpressionType(node.value);
            const isCast = node.value.$type && node.value.$type.includes('Cast');
            if (valueType === 'number' && !isCast) {
                this.validationAccept('warning', 'Movement value should include a unit (using cast to cm or mm)', { 
                    node, 
                    property: 'value' 
                });
            }
            
            // Visit the value expression
            this.visitExpression(node.value);
        }
        
        // Check direction validity
        if (!['Forward', 'Backward', 'Left', 'Right'].includes(node.direction)) {
            this.validationAccept('error', `Invalid movement direction "${node.direction}"`, { 
                node, 
                property: 'direction' 
            });
        }
    }
    
    visitClock(node: ast.Clock): void {
        // Check that angle is numeric
        if (node.angle) {
            this.checkNumericExpression(node.angle, 'Clock angle must be numeric', node);
            this.visitExpression(node.angle);
        }
    }
    
    visitSpeed(node: ast.Speed): void {
        // Check that value is numeric
        if (node.value) {
            this.checkNumericExpression(node.value, 'Speed value must be numeric', node);
            
            // Check for positive value
            if (this.isNegativeLiteral(node.value)) {
                this.validationAccept('error', 'Speed value must be positive', { node, property: 'value' });
            }
            
            // Visit the value expression
            this.visitExpression(node.value);
        }
    }
    
    visitFunctionCall(node: ast.FunctionCall): void {
        if (!node.functioncall || !node.functioncall.ref) return;
        
        const funcDef = node.functioncall.ref;
        const funcParams = funcDef.params || [];
        
        // Check argument count
        if ((node.args?.length || 0) !== funcParams.length) {
            this.validationAccept('error', 
                `Function call '${funcDef.name}' expects ${funcParams.length} argument(s), but got ${node.args?.length || 0}.`, {
                node
            });
            return;
        }
        
        // Check argument types
        node.args?.forEach((arg, index) => {
            const paramType = funcParams[index].type;
            const argType = this.getExpressionType(arg);
            
            if (!this.areTypesCompatible(argType, paramType)) {
                this.validationAccept('error', 
                    `Argument ${index + 1} of function '${funcDef.name}' expects type '${paramType}', but got '${argType}'`, {
                    node,
                    property: 'args',
                    index
                });
            }
            
            // Visit the argument expression
            this.visitExpression(arg);
        });
    }
    
    visitReturn(node: ast.Return): void {
        // Find the enclosing function
        const funcNode = this.findEnclosingFunction(node);
        if (!funcNode) {
            this.validationAccept('error', 'Return statement outside function body', { node });
            return;
        }
        
        // Get function return type
        const funcReturnType = funcNode.returnType;
        
        // Check return type compatibility
        if (funcReturnType !== 'void') {
            const valueType = this.getExpressionType(node.value);
            if (!this.areTypesCompatible(valueType, funcReturnType)) {
                this.validationAccept('error', 
                    `Cannot return value of type "${valueType}" from function that returns "${funcReturnType}"`, {
                    node,
                    property: 'value'
                });
            }
        } else if (node.value) {
            // Function is void but has a return value
            this.validationAccept('error', 'Void function should not return a value', { node });
        }
        
        // Visit the return value
        if (node.value) {
            this.visitExpression(node.value);
        }
    }
    
    visitVariable(node: ast.Variable): void {
        // Check if variable is defined
        if (!node.ref || !node.ref.$refText) {
            this.validationAccept('error', 'Reference to undefined variable', { node });
            return;
        }
        
        // Also check in our symbol table for scope-appropriate variables
        const refName = node.ref.$refText;
        const symbol = this.findVariable(refName);
        
        if (!symbol && !ast.isAbstractVariableDecl(node.ref)) {
            this.validationAccept('warning', `Variable '${refName}' might be used outside its scope`, { node });
        }
    }
    
    visitBlock(node: ast.Block): void {
        // Enter a new scope when visiting a block
        this.enterScope();

        // Visit all statements in the block
        if (node.statements) {
            for (const statement of node.statements) {
                this.visitStatement(statement);
            }
        }

        // Exit the scope when leaving the block
        this.exitScope();
    }
    
    visitStatement(node: ast.Statement): void {
        // Dispatch to the appropriate visit method based on node type
        if (ast.isVariableDecl(node)) {
            this.visitVariableDecl(node);
        } else if (ast.isVariableAssign(node)) {
            this.visitVariableAssign(node);
        } else if (ast.isLoop(node)) {
            this.visitLoop(node);
        } else if (ast.isReturn(node)) {
            this.visitReturn(node);
        } else if (ast.isFunctionCall(node)) {
            this.visitFunctionCall(node);
        } else if (ast.isMovement(node)) {
            this.visitMovement(node);
        } else if (ast.isClock(node)) {
            this.visitClock(node);
        } else if (ast.isSpeed(node)) {
            this.visitSpeed(node);
        } else if (ast.isComment(node)) {
            // No validation needed for comments
        }
        // Unknown statement type falls through
    }
    
    visitExpression(node: ast.Expression): void {
        // Dispatch to the appropriate visit method based on node type
        if (!node) return;
        
        if (ast.isBinaryOperation(node)) {
            this.visitBinaryOperation(node);
        } else if (ast.isLogicalExpr(node)) {
            this.visitLogicalExpr(node);
        } else if (ast.isBooleanExpr(node)) {
            this.visitBooleanExpr(node);
        } else if (ast.isCast(node)) {
            this.visitCast(node);
        } else if (ast.isFunctionCall(node)) {
            this.visitFunctionCall(node);
        } else if (ast.isVariable(node)) {
            this.visitVariable(node);
        } else if (ast.isParenExpr(node) && node.expr) {
            this.visitExpression(node.expr);
        }
        // Literals (BooleanLiteral, NumberLiteral) don't need validation
    }
    
    // Symbol table management
    
    /**
     * Enter a new scope level
     */
    private enterScope(): void {
        this.currentScope++;
    }
    
    /**
     * Exit the current scope level and clear all symbols from this scope
     */
    private exitScope(): void {
        // Remove all symbols from current scope before decreasing the scope level
        for (const [key, symbol] of this.symbolTable.entries()) {
            if (symbol.scope === this.currentScope) {
                this.symbolTable.delete(key);
            }
        }
        this.currentScope--;
    }
    
    /**
     * Declare a variable and check for duplicates in the current scope
     */
    private declareVariable(node: ast.AbstractVariableDecl): void {
        const name = node.name;
        
        // Check if variable is already declared in the current scope only
        if (this.isVariableDeclaredInCurrentScope(name)) {
            this.validationAccept(
                'error',
                `Variable '${name}' is already declared in this scope`,
                { node }
            );
            return;
        }
        
        // Add to symbol table with current scope
        this.symbolTable.set(name, {
            name: name,
            type: node.type,
            node: node,
            scope: this.currentScope
        });
    }
    
    /**
     * Find a variable in the symbol table, searching from current scope up to global scope
     */
    private findVariable(name: string): Symbol | undefined {
        const symbol = this.symbolTable.get(name);
        
        // If no symbol or symbol is from a higher scope number (inner scope)
        // than current scope, it's not visible
        if (symbol && symbol.scope <= this.currentScope) {
            return symbol;
        }
        
        return undefined;
    }
    
    // Helper methods
    
    /**
     * Get a simple type for an expression
     */
    private getExpressionType(expr: ast.Expression): string {
        if (!expr) return 'void';
        
        // If there's a specific intended unit type for this expression node, use it
        if ('_unitType' in expr) {
            return (expr as any)._unitType;
        }
        
        if (ast.isBooleanLiteral(expr) || ('value' in expr && typeof expr.value === 'boolean')) {
            return 'boolean';
        }
        
        if (ast.isNumberLiteral(expr) || ('value' in expr && typeof expr.value === 'number')) {
            // Check if this is inside a unit declaration context
            return 'number';
        }
        
        // Improved variable reference handling
        if (ast.isVariable(expr)) {
            // First try to find the variable in our symbol table
            // Get reference name from the variable
            let refName = '';
            if (expr.ref && expr.ref.$refText) {
                refName = expr.ref.$refText;
            } else if ('$refText' in expr) {
                refName = (expr as any).$refText;
            } else if ('name' in expr) {
                refName = (expr as any).name;
            }
            
            const symbol = this.findVariable(refName);
            
            if (symbol) {
                return symbol.type;
            }
            
            // Fallback to reference if available
            if (expr.ref && ast.isAbstractVariableDecl(expr.ref)) {
                return expr.ref.type || 'unknown';
            }
            
            return 'unknown';
        }
        
        if (ast.isBinaryOperation(expr)) {
            return 'number'; // Arithmetic operations return numbers
        }
        
        if (ast.isBooleanExpr(expr)) {
            return 'boolean';
        }
        
        if (ast.isLogicalExpr(expr)) {
            return 'boolean';
        }
        
        if (ast.isFunctionCall(expr) && expr.functioncall && expr.functioncall.ref) {
            return expr.functioncall.ref.returnType || 'void';
        }
        
        if (ast.isParenExpr(expr) && expr.expr) {
            return this.getExpressionType(expr.expr);
        }
        
        // Handle cast safely
        if (expr.$type && expr.$type.includes('Cast')) {
            // Type as any to avoid strict typing errors
            return (expr as any).type || 'unknown';
        }
        
        return 'unknown';
    }
    
    /**
     * Check if two types are compatible
     */
    private areTypesCompatible(sourceType: string, targetType: string): boolean {
        // Same types are always compatible
        if (sourceType === targetType) return true;
        
        // Units are compatible with number
        if (sourceType === 'number' && (targetType === 'cm' || targetType === 'mm')) return true;
        if (targetType === 'number' && (sourceType === 'cm' || sourceType === 'mm')) return true;
        
        // Units are compatible with each other
        if ((sourceType === 'cm' && targetType === 'mm') || (sourceType === 'mm' && targetType === 'cm')) return true;
        
        return false;
    }
    
    /**
     * Check if an expression is a literal with value 0
     */
    private isZeroLiteral(expr: ast.Expression): boolean {
        return (ast.isNumberLiteral(expr) && 'value' in expr && typeof expr.value === 'number' && expr.value === 0);
    }
    
    /**
     * Check if an expression is a literal with a negative value
     */
    private isNegativeLiteral(expr: ast.Expression): boolean {
        return (ast.isNumberLiteral(expr) && 'value' in expr && typeof expr.value === 'number' && expr.value < 0);
    }
    
    /**
     * Check that an expression is numeric and report an error if not
     */
    private checkNumericExpression(expr: ast.Expression, errorMessage: string, contextNode: any): void {
        const exprType = this.getExpressionType(expr);
        if (exprType !== 'number' && exprType !== 'cm' && exprType !== 'mm') {
            this.validationAccept('error', `${errorMessage}, got "${exprType}"`, { 
                node: contextNode,
                property: 'value'
            });
        }
    }
    
    /**
     * Check that an expression is boolean and report an error if not
     */
    private checkBooleanExpression(expr: ast.Expression, errorMessage: string, contextNode: any): void {
        const exprType = this.getExpressionType(expr);
        if (exprType !== 'boolean') {
            this.validationAccept('error', `${errorMessage}, got "${exprType}"`, { 
                node: contextNode,
                property: 'condition'
            });
        }
    }
    
    /**
     * Check type compatibility for an assignment
     */
    private checkAssignmentTypeCompatibility(targetType: string, valueExpr: ast.Expression, contextNode: any): void {
        let valueType = this.getExpressionType(valueExpr);
        
        // Add specific check for boolean/number type mismatch which should always fail
        if ((targetType === 'boolean' && valueType === 'number') || 
            (targetType === 'number' && valueType === 'boolean')) {
            this.validationAccept(
                'error',
                `Cannot assign ${valueType} to ${targetType}`,
                { node: contextNode }
            );
            return;
        }
        
        // Automatic unit casting for number literals assigned to unit-typed variables
        if (this.isUnitType(targetType) && valueType === 'number' && ast.isNumberLiteral(valueExpr)) {
            // Tag the expression with the unit type for later use
            (valueExpr as any)._unitType = targetType;
            
            // Update valueType to reflect the automatic cast
            valueType = targetType;
            
            // Add informational message about automatic unit casting
            this.validationAccept('info', `Automatically cast number to ${targetType}`, {
                node: contextNode,
                property: 'expr'
            });
        }
        
        if (!this.areTypesCompatible(valueType, targetType)) {
            this.validationAccept('error', `Cannot assign value of type "${valueType}" to variable of type "${targetType}"`, {
                node: contextNode,
                property: 'expr'
            });
        }
    }
    
    /**
     * Find the function that contains this node
     */
    private findEnclosingFunction(node: any): ast.FunctionDef | undefined {
        let current = node;
        while (current) {
            if (current.$type === 'FunctionDef') {
                return current;
            }
            current = current.$container;
        }
        return undefined;
    }
    
    // Empty implementations for remaining abstract methods
    visitAbstractVariableDecl(node: AbstractVariableDecl): void {}
    visitVariableFunDecl(node: ast.VariableFunDecl): void {}
    visitBooleanLiteral(node: ast.BooleanLiteral): void {}
    visitNumberLiteral(node: ast.NumberLiteral): void {}
    visitLiteral(node: ast.Literal): void {}
    visitUnitValue(node: ast.UnitValue): void {}
    visitCommand(node: ast.Command): void {}
    visitForward(node: ast.Forward): void {}
    visitRotation(node: ast.Rotation): void {}
    visitComment(node: ast.Comment): void {}
    visitParenExpr(node: ast.ParenExpr): void {
        if (node.expr) {
            this.visitExpression(node.expr);
        }
    }

    // Add method to check if variable exists in current scope only
    private isVariableDeclaredInCurrentScope(name: string): boolean {
        const symbol = this.symbolTable.get(name);
        return symbol !== undefined && symbol.scope === this.currentScope;
    }

    /**
     * Check if a block has at least one return statement
     */
    private blockHasReturn(block: ast.Block): boolean {
        if (!block.statements) return false;
        
        return block.statements.some(stmt => {
            // Direct return statement
            if (stmt.$type === 'Return') {
                return true;
            }
            
            // Return in a nested loop
            if (stmt.$type === 'Loop' && 'block' in stmt) {
                const loopBlock = stmt.block;
                if (ast.isBlock(loopBlock)) {
                    return this.blockHasReturn(loopBlock);
                }
            }
            
            return false;
        });
    }
}
