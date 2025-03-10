import * as ts from 'typescript';
import { NodeUtils } from './node-utils';
import { SCLTypeEnum } from '../core/types/types';

/**
 * Type definitions for formatter functions and configuration
 */
type FormatterFunction<T = any> = (value: T) => string;
type TypeFormatter<T = any> = Partial<Record<SCLTypeEnum, FormatterFunction<T>>>;

interface TimeConfig {
  prefix: string;
  pattern: RegExp;
}

export class TypeExtractor {
  // --- Configurations & Formatters ---

  private static readonly TIME_CONFIGS: Record<string, TimeConfig> = {
    TIME: { prefix: 'T#', pattern: /^\d+[smhd]/ },
    LTIME: { prefix: 'LT#', pattern: /^\d+[smhd]/ },
    DATE: { prefix: 'D#', pattern: /^\d{4}-\d{2}-\d{2}/ },
    TOD: { prefix: 'TOD#', pattern: /^\d{2}:\d{2}:\d{2}/ },
    LTOD: { prefix: 'LTOD#', pattern: /^\d{2}:\d{2}:\d{2}/ },
    DT: { prefix: 'DT#', pattern: /^\d{4}-\d{2}-\d{2}-\d{2}:\d{2}:\d{2}/ },
    LDT: { prefix: 'LDT#', pattern: /^\d{4}-\d{2}-\d{2}-\d{2}:\d{2}:\d{2}/ },
    DTL: { prefix: 'DTL#', pattern: /^\d{4}-\d{2}-\d{2}-\d{2}:\d{2}:\d{2}\.\d{3}/ },
  };

  private static readonly formatters: Record<SCLTypeEnum, FormatterFunction> = {
    ...this.createNumericFormatters(),
    ...this.createHexFormatters(),
    ...this.createTimeFormatters(),
    ...this.createHardwareFormatters(),
    ...this.createEventFormatters(),
    ...this.createConnectionFormatters(),
    ...this.createMiscFormatters(),
  } as Record<SCLTypeEnum, FormatterFunction>;

  // --- Formatter creators ---

  private static createNumericFormatters(): TypeFormatter<number> {
    return {
      [SCLTypeEnum.SINT]: String,
      [SCLTypeEnum.USINT]: String,
      [SCLTypeEnum.INT]: String,
      [SCLTypeEnum.UINT]: String,
      [SCLTypeEnum.DINT]: String,
      [SCLTypeEnum.UDINT]: String,
      [SCLTypeEnum.LINT]: String,
      [SCLTypeEnum.ULINT]: String,
      [SCLTypeEnum.REAL]: (value: number) => this.formatRealValue(value),
    };
  }

  private static createHexFormatters(): TypeFormatter<number> {
    return {
      [SCLTypeEnum.DWORD]: (value: number) => this.formatHexValue(value, 8, 'DW'),
      [SCLTypeEnum.WORD]: (value: number) => this.formatHexValue(value, 4, 'W'),
      [SCLTypeEnum.BYTE]: (value: number) => this.formatHexValue(value, 2, 'B'),
    };
  }

  private static createTimeFormatters(): TypeFormatter<string> {
    const timeFormatters: TypeFormatter<string> = {};
    Object.entries(this.TIME_CONFIGS).forEach(([type, config]) => {
      timeFormatters[SCLTypeEnum[type as keyof typeof SCLTypeEnum]] =
        (value: string) => this.formatTimeValue(value, config.prefix);
    });
    return timeFormatters;
  }

  private static createHardwareFormatters(): TypeFormatter<number> {
    return {
      [SCLTypeEnum.HW_ANY]: String,
      [SCLTypeEnum.HW_IO]: String,
      [SCLTypeEnum.HW_DEVICE]: String,
      [SCLTypeEnum.HW_DPMASTER]: String,
      [SCLTypeEnum.HW_DPSLAVE]: String,
      [SCLTypeEnum.HW_IOSYSTEM]: String,
      [SCLTypeEnum.HW_SUBMODULE]: String,
      [SCLTypeEnum.HW_MODULE]: String,
      [SCLTypeEnum.HW_INTERFACE]: String,
      [SCLTypeEnum.HW_IEPORT]: String,
      [SCLTypeEnum.HW_HSC]: String,
      [SCLTypeEnum.HW_PWM]: String,
      [SCLTypeEnum.HW_PTO]: String,
    };
  }

  private static createEventFormatters(): TypeFormatter<number> {
    return {
      [SCLTypeEnum.EVENT_ANY]: String,
      [SCLTypeEnum.EVENT_ATT]: String,
      [SCLTypeEnum.EVENT_HWINT]: String,
      [SCLTypeEnum.OB_ANY]: String,
      [SCLTypeEnum.OB_DELAY]: String,
      [SCLTypeEnum.OB_TOD]: String,
      [SCLTypeEnum.OB_CYCLIC]: String,
      [SCLTypeEnum.OB_ATT]: String,
      [SCLTypeEnum.OB_HWINT]: String,
      [SCLTypeEnum.OB_TIMEERROR]: String,
      [SCLTypeEnum.OB_STARTUP]: String,
    };
  }

  private static createConnectionFormatters(): TypeFormatter<number> {
    return {
      [SCLTypeEnum.CONN_ANY]: String,
      [SCLTypeEnum.CONN_PRG]: String,
      [SCLTypeEnum.CONN_OUC]: String,
      [SCLTypeEnum.CONN_R_ID]: String,
      [SCLTypeEnum.DB_ANY]: String,
      [SCLTypeEnum.DB_WWW]: String,
      [SCLTypeEnum.DB_DYN]: String,
    };
  }

  private static createMiscFormatters(): TypeFormatter {
    return {
      [SCLTypeEnum.BOOL]: (value: boolean) => (value ? 'TRUE' : 'FALSE'),
      [SCLTypeEnum.STRING]: (value: string) => this.formatStringValue(value),
      [SCLTypeEnum.VOID]: () => '',
      [SCLTypeEnum.ANY]: String,
      [SCLTypeEnum.AOM_IDENT]: String,
      [SCLTypeEnum.REMOTE]: String,
      [SCLTypeEnum.PORT]: String,
      [SCLTypeEnum.RTM]: String,
      [SCLTypeEnum.PIP]: String,
    };
  }

  // --- Value Extraction & Formatting ---

  /**
   * Extracts and converts a value from a TypeScript expression based on its branded type.
   */
  static extractValue(initializer: ts.Expression, type?: ts.TypeNode | string): string | undefined {
    if (!initializer) return this.getDefaultValue(type);

    const brandedType = type ? this.extractBrandedType(type) : undefined;
    const value = this.extractRawValue(initializer, type);
    if (value === undefined) return this.getDefaultValue(type);

    return this.formatValue(value, brandedType);
  }

  /**
   * Extracts the type name from a branded type node or string.
   */
  static extractBrandedType(typeNode: ts.TypeNode | string): SCLTypeEnum | undefined {
    try {
      if (typeof typeNode === 'string') {
        return SCLTypeEnum[typeNode as keyof typeof SCLTypeEnum];
      }
      const typeName = NodeUtils.extractTypeName(typeNode);
      return typeName ? SCLTypeEnum[typeName as keyof typeof SCLTypeEnum] : undefined;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to extract branded type: ${message}`);
    }
  }

  /**
   * Returns a default value for a given type.
   */
  public static getDefaultValue(type?: ts.TypeNode | string): string | undefined {
    if (!type) return undefined;
    const brandedType = typeof type === 'string' ? this.extractBrandedType(type) : type;
    switch (brandedType) {
      case SCLTypeEnum.STRING:
        return "''";
      case SCLTypeEnum.WORD:
        return 'W#16#0000';
      case SCLTypeEnum.BOOL:
        return 'FALSE';
      case SCLTypeEnum.INT:
        return '0';
      case SCLTypeEnum.DINT:
        return '0';
      case SCLTypeEnum.REAL:
        return '0.0';
      default:
        return undefined;
    }
  }

  /**
   * Extracts a raw value from an expression.
   */
  private static extractRawValue(expr: ts.Expression, type?: ts.TypeNode | string): any {
    if (expr.kind === ts.SyntaxKind.TrueKeyword) {
      return true;
    } else if (expr.kind === ts.SyntaxKind.FalseKeyword) {
      return false;
    }
    if (this.isLiteral(expr)) {
      return this.extractLiteralValue(expr);
    }
    if (ts.isArrayLiteralExpression(expr)) {
      return this.extractArrayValue(expr, type);
    }
    return undefined;
  }

  /**
   * Formats a value according to its type and SCL requirements.
   */
  private static formatValue(value: any, brandedType?: SCLTypeEnum): string {
    if (brandedType && this.formatters[brandedType]) {
      if (typeof value === 'string' && this.isTimeValue(value)) {
        return this.formatTimeValue(value, 'T#');
      }
      return this.formatters[brandedType](value);
    }

    // Special handling for boolean values
    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }

    return value?.toString() ?? '';
  }

  // --- Helper Formatting Methods ---

  private static formatRealValue(value: number): string {
    return value.toString().includes('.') ? value.toString() : value.toFixed(2);
  }

  private static formatHexValue(value: number, padLength: number, prefix: string): string {
    return `${prefix}#16#${value.toString(16).toUpperCase().padStart(padLength, '0')}`;
  }

  private static formatStringValue(value: string): string {
    return value === '' ? "''" : `'${value}'`;
  }

  private static formatTimeValue(value: string, prefix: string): string {
    const cleanValue = value.replace(/['"]/g, '');
    if (cleanValue.startsWith(prefix)) return cleanValue;
    if (cleanValue.startsWith('T#') && prefix !== 'T#') {
      return prefix + cleanValue.substring(2);
    }
    // Use the provided pattern from config if possible; otherwise, fall back to simple concatenation.
    return `${prefix}${cleanValue}`;
  }

  // --- Expression Value Extraction Helpers ---

  private static isLiteral(expr: ts.Expression): boolean {
    return (
      expr.kind === ts.SyntaxKind.TrueKeyword ||
      expr.kind === ts.SyntaxKind.FalseKeyword ||
      ts.isNumericLiteral(expr) ||
      ts.isStringLiteral(expr)
    );
  }

  private static extractLiteralValue(literal: ts.Expression): any {
    if (literal.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (literal.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isNumericLiteral(literal)) return Number(literal.text);
    if (ts.isStringLiteral(literal)) {
      const text = literal.text.replace(/['"]/g, '');
      // Custom handling for time strings or other branded values can go here.
      if (text.startsWith('T#') || /^\d+[smhd]/.test(text)) {
        return text.startsWith('T#') ? text : `T#${text}`;
      }
      return text;
    }
    return undefined;
  }

  private static extractArrayValue(array: ts.ArrayLiteralExpression, type?: ts.TypeNode | string): string | undefined {
    if (array.elements.length === 0) return undefined;
    const values = array.elements.map((element) => {
      const extracted = this.extractValue(element, type);
      return extracted !== undefined ? extracted.replace(/['"]/g, '') : undefined;
    });
    return values.includes(undefined) ? undefined : values.join(',');
  }

  // --- Helpers for Checking Value Types ---

  private static isTimeValue(value: string): boolean {
    return Object.values(this.TIME_CONFIGS).some(config =>
      value.startsWith(config.prefix) || config.pattern.test(value)
    );
  }

  private static isArrayValue(value: string): boolean {
    return value.includes(',');
  }
}
