import { inject, type Module } from 'langium';
import { createDefaultModule, createDefaultSharedModule, type DefaultSharedModuleContext, type LangiumServices, type LangiumSharedServices, type PartialLangiumServices } from 'langium/lsp';
import { RobotMLInterpreter } from '../semantics/interpreter.js';
import { RobotMlTypeChecker } from '../semantics/type-checker.js';
import { RobotMlGeneratedModule, RobotMlGeneratedSharedModule } from './generated/module.js';
import { RobotMlAcceptWeaver } from './robot-ml-accept-weaver.js';
import { registerValidationChecks, RobotMlValidator } from './robot-ml-validator.js';

/**
 * Declaration of custom services - add your own service classes here.
 */
export type RobotMlAddedServices = {
    visitors: {
        RobotMlValidator: RobotMlValidator
        RobotMlAcceptWeaver: RobotMlAcceptWeaver
        RobotMlInterpreter: RobotMLInterpreter
        RobotMlTypeChecker: RobotMlTypeChecker
    }
}

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type RobotMlServices = LangiumServices & RobotMlAddedServices

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const RobotMlModule: Module<RobotMlServices, PartialLangiumServices & RobotMlAddedServices> = {
    visitors: {
        RobotMlValidator: () => new RobotMlValidator(),
        RobotMlAcceptWeaver: (services) => new RobotMlAcceptWeaver(services),
        RobotMlInterpreter: () => new RobotMLInterpreter(),
        RobotMlTypeChecker: () => new RobotMlTypeChecker()
    }
};

/**
 * Create the full set of services required by Langium.
 *
 * First inject the shared services by merging two modules:
 *  - Langium default shared services
 *  - Services generated by langium-cli
 *
 * Then inject the language-specific services by merging three modules:
 *  - Langium default language-specific services
 *  - Services generated by langium-cli
 *  - Services specified in this file
 *
 * @param context Optional module context with the LSP connection
 * @returns An object wrapping the shared services and the language-specific services
 */
export function createRobotMlServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices,
    RobotMl: RobotMlServices
} {
    const shared = inject(
        createDefaultSharedModule(context),
        RobotMlGeneratedSharedModule
    );
    const RobotMl = inject(
        createDefaultModule({ shared }),
        RobotMlGeneratedModule,
        RobotMlModule
    );
    shared.ServiceRegistry.register(RobotMl);

    RobotMl.visitors.RobotMlAcceptWeaver;

    registerValidationChecks(RobotMl);
    
    if (!context.connection) {
        // We don't run inside a language server
        // Therefore, initialize the configuration provider instantly
        shared.workspace.ConfigurationProvider.initialized({});
    }
    return { shared, RobotMl };
}