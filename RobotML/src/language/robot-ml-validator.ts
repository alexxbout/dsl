import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { FunctionCall, FunctionDef, RobotMlAstType, Speed } from './generated/ast.js';
import { Cast, Clock, isCast, Movement } from './generated/ast.js';
import type { RobotMlServices } from './robot-ml-module.js';
import { registerVisitorAsValidator } from './robot-ml-visitor.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: RobotMlServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.visitors.RobotMlValidator;
    const typeChecker = services.visitors.RobotMlTypeChecker;

    const checks: ValidationChecks<RobotMlAstType> = {
        Movement: validator.checkMovementUnitCast,
        Clock: validator.checkClockNotCast,
        Speed: validator.checkSpeedWrongUnit,
        FunctionDef: [
            validator.checkFunctionNameUnique,
            validator.checkUniqueParameterNames
        ],
        FunctionCall: [
            validator.checkFunctionCallArgCount
        ],
        VariableDecl: validator.checkVariableType
    };

    registry.register(checks, validator);

    registerVisitorAsValidator(typeChecker, services);
}

/**
 * Implementation of custom validations.
 */
export class RobotMlValidator {

    /**
     * Vérifie que la valeur d'un mouvement est castée à mm ou cm.
     * 
     * @param movement 
     * @param accept 
     */
    checkMovementUnitCast(movement: Movement, accept: ValidationAcceptor): void {
        if (!isCast(movement.value)) {
            accept('error', 'Movement value must be a cast.', { node: movement });
        } else {
            if ((movement.value as Cast).type !== 'mm' && (movement.value as Cast).type !== 'cm') {
                accept('error', 'Movement value can only be cast to mm or cm.', { node: movement });
            }
        }
    }

    /**
     * Vérifie que l'angle d'un Clock n'est pas casté.
     * 
     * @param clock 
     * @param accept 
     */
    checkClockNotCast(clock: Clock, accept: ValidationAcceptor): void {
        if (isCast(clock.angle)) {
            accept('error', 'Clock angle cannot be cast.', { node: clock });
        }
    }

    /**
     * Vérifie que la valeur d'une vitesse est soit un nombre, soit une expression castée à cm ou mm.
     * 
     * @param speed 
     * @param accept 
     */
    checkSpeedWrongUnit(speed: Speed, accept: ValidationAcceptor): void {
        if (isCast(speed.value)) {
            if ((speed.value as Cast).type !== 'cm' && (speed.value as Cast).type !== 'mm') {
                accept('error', 'Speed value can only be cast to cm or mm.', { node: speed });
            }
        }
    }

    /**
     * Vérifie que le nom de la fonction n'est pas déjà utilisé.
     * @param functionDef 
     * @param accept  
     */
    checkFunctionNameUnique(functionDef: FunctionDef, accept: ValidationAcceptor): void {
        const container = functionDef.$container;
        if (container && 'functions' in container) {
            const functions = container.functions;
            const duplicates = functions.filter(f => 
                f.name === functionDef.name && f !== functionDef
            );
            if (duplicates.length > 0) {
                accept('error', `Function name '${functionDef.name}' is already defined`, {
                    node: functionDef
                });
            }
        }
    }

    /**
     * Vérifie que le nombre d'arguments d'un appel de fonction correspond
     * au nombre de paramètres déclarés dans la définition de la fonction.
     * 
     * @param functionCall 
     * @param accept 
     */
    checkFunctionCallArgCount(functionCall: FunctionCall, accept: ValidationAcceptor): void {
        const funcDef = functionCall.functioncall.ref;
        if (funcDef) {
            const funcDefParams = funcDef.params;
            if (functionCall.args.length !== funcDefParams.length) {
                accept('error', `Function call '${funcDef.name}' expects ${funcDefParams.length} argument(s), but got ${functionCall.args.length}.`, { node: functionCall });
            }
        }
    }

    /**
     * Vérifie que les noms des paramètres dans une définition de fonction sont uniques.
     * 
     * @param functionDef 
     * @param accept 
     */
    checkUniqueParameterNames(functionDef: FunctionDef, accept: ValidationAcceptor): void {
        const paramNames = functionDef.params.map(p => p.name);
        const duplicates = paramNames.filter((name, index, arr) => arr.indexOf(name) !== index);
        if (duplicates.length > 0) {
            accept('error', `Function '${functionDef.name}' has duplicate parameter name(s): ${duplicates.join(', ')}.`, { node: functionDef });
        }
    }
}
