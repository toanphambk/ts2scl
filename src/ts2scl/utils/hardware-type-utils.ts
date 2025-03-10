import { SCLTypeEnum } from '../core/types/types';

// Type inheritance map defining the parent-child relationships
const typeInheritanceMap = new Map<SCLTypeEnum, SCLTypeEnum>([
    // HW_* inheritance
    [SCLTypeEnum.HW_IO, SCLTypeEnum.HW_ANY],
    [SCLTypeEnum.HW_DEVICE, SCLTypeEnum.HW_ANY],
    [SCLTypeEnum.HW_DPMASTER, SCLTypeEnum.HW_INTERFACE],
    [SCLTypeEnum.HW_DPSLAVE, SCLTypeEnum.HW_DEVICE],
    [SCLTypeEnum.HW_IOSYSTEM, SCLTypeEnum.HW_ANY],
    [SCLTypeEnum.HW_SUBMODULE, SCLTypeEnum.HW_IO],
    [SCLTypeEnum.HW_MODULE, SCLTypeEnum.HW_IO],
    [SCLTypeEnum.HW_INTERFACE, SCLTypeEnum.HW_SUBMODULE],
    [SCLTypeEnum.HW_IEPORT, SCLTypeEnum.HW_SUBMODULE],
    [SCLTypeEnum.HW_HSC, SCLTypeEnum.HW_SUBMODULE],
    [SCLTypeEnum.HW_PWM, SCLTypeEnum.HW_SUBMODULE],
    [SCLTypeEnum.HW_PTO, SCLTypeEnum.HW_SUBMODULE],
    [SCLTypeEnum.PORT, SCLTypeEnum.HW_SUBMODULE],

    // EVENT_* inheritance
    [SCLTypeEnum.EVENT_ATT, SCLTypeEnum.EVENT_ANY],
    [SCLTypeEnum.EVENT_HWINT, SCLTypeEnum.EVENT_ATT],

    // OB_* inheritance
    [SCLTypeEnum.OB_DELAY, SCLTypeEnum.OB_ANY],
    [SCLTypeEnum.OB_TOD, SCLTypeEnum.OB_ANY],
    [SCLTypeEnum.OB_CYCLIC, SCLTypeEnum.OB_ANY],
    [SCLTypeEnum.OB_ATT, SCLTypeEnum.OB_ANY],
    [SCLTypeEnum.OB_HWINT, SCLTypeEnum.OB_ATT],
    [SCLTypeEnum.OB_TIMEERROR, SCLTypeEnum.OB_ANY],
    [SCLTypeEnum.OB_STARTUP, SCLTypeEnum.OB_ANY],

    // CONN_* inheritance
    [SCLTypeEnum.CONN_PRG, SCLTypeEnum.CONN_ANY],
    [SCLTypeEnum.CONN_OUC, SCLTypeEnum.CONN_ANY],

    // DB_* inheritance
    [SCLTypeEnum.DB_WWW, SCLTypeEnum.DB_ANY],
    [SCLTypeEnum.DB_DYN, SCLTypeEnum.DB_ANY],
]);

/**
 * Checks if a type is a hardware data type
 * @param type The type to check
 * @returns True if the type is a hardware data type
 */
export function isHardwareType(type: SCLTypeEnum): boolean {
    return type.startsWith('HW_') ||
        type.startsWith('OB_') ||
        type.startsWith('EVENT_') ||
        type.startsWith('CONN_') ||
        type.startsWith('DB_') ||
        type === SCLTypeEnum.REMOTE ||
        type === SCLTypeEnum.PORT ||
        type === SCLTypeEnum.RTM ||
        type === SCLTypeEnum.PIP;
}

/**
 * Gets all ancestor types of a given type
 * @param type The type to get ancestors for
 * @returns Array of ancestor types
 */
export function getTypeAncestors(type: SCLTypeEnum): SCLTypeEnum[] {
    const ancestors: SCLTypeEnum[] = [];
    let currentType = type;

    while (typeInheritanceMap.has(currentType)) {
        const parentType = typeInheritanceMap.get(currentType)!;
        ancestors.push(parentType);
        currentType = parentType;
    }

    return ancestors;
}

/**
 * Checks if one type is assignable to another type (considering inheritance)
 * @param sourceType The source type
 * @param targetType The target type
 * @returns True if sourceType can be assigned to targetType
 */
export function isTypeAssignable(sourceType: SCLTypeEnum, targetType: SCLTypeEnum): boolean {
    if (sourceType === targetType) {
        return true;
    }

    const ancestors = getTypeAncestors(sourceType);
    return ancestors.includes(targetType);
}

/**
 * Gets the base type of a hardware type
 * @param type The type to get the base type for
 * @returns The base type (e.g., HW_ANY for HW_* types, OB_ANY for OB_* types)
 */
export function getBaseType(type: SCLTypeEnum): SCLTypeEnum | undefined {
    const ancestors = getTypeAncestors(type);
    return ancestors[ancestors.length - 1];
}

/**
 * Validates if a type can be used with a specific instruction
 * @param type The type to validate
 * @param instruction The instruction name
 * @returns True if the type is valid for the instruction
 */
export function isValidTypeForInstruction(type: SCLTypeEnum, instruction: string): boolean {
    // Instruction-specific type validation
    switch (instruction.toUpperCase()) {
        case 'CTRL_HSC':
        case 'CTRL_HSC_EXT':
            return type === SCLTypeEnum.HW_HSC ||
                isTypeAssignable(type, SCLTypeEnum.HW_HSC);

        case 'CTRL_PWM':
            return type === SCLTypeEnum.HW_PWM ||
                isTypeAssignable(type, SCLTypeEnum.HW_PWM);

        case 'PUT':
        case 'GET':
            return type === SCLTypeEnum.REMOTE ||
                type === SCLTypeEnum.CONN_ANY ||
                isTypeAssignable(type, SCLTypeEnum.CONN_ANY);

        case 'SRT_DINT':
        case 'CAN_DINT':
            return type === SCLTypeEnum.OB_DELAY ||
                isTypeAssignable(type, SCLTypeEnum.OB_DELAY);

        case 'SET_TINT':
        case 'CAN_TINT':
            return type === SCLTypeEnum.OB_TOD ||
                isTypeAssignable(type, SCLTypeEnum.OB_TOD);

        case 'ATTACH':
        case 'DETACH':
            return type === SCLTypeEnum.OB_ATT ||
                isTypeAssignable(type, SCLTypeEnum.OB_ATT);

        default:
            return true;
    }
} 