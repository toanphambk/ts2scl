// Type definitions
type Distinct<T, DistinctName> = T & { __TYPE__: DistinctName };


export type SCLCategory = 'FC' | 'FB' | 'DB' | 'UDT';
export type SCLVarType = 'IN' | 'OUT' | 'INOUT' | 'TEMP' | 'STATIC';

// Hardware data type base types
export type ANY = unknown & { __brand: 'ANY' };
export type AOM_IDENT = number & { __brand: 'AOM_IDENT' };

// Hardware identification types (HW_*)
export type HW_ANY = Distinct<number, 'HW_ANY'>;                    // Base type for hardware components
export type HW_IO = Distinct<HW_ANY, 'HW_IO'>;                     // CPU or interface identification
export type HW_DEVICE = Distinct<HW_ANY, 'HW_DEVICE'>;             // DP slave/PROFINET IO device
export type HW_DPMASTER = Distinct<HW_INTERFACE, 'HW_DPMASTER'>;    // DP master
export type HW_DPSLAVE = Distinct<HW_DEVICE, 'HW_DPSLAVE'>;        // DP slave
export type HW_IOSYSTEM = Distinct<HW_ANY, 'HW_IOSYSTEM'>;         // PN/IO or DP master system
export type HW_SUBMODULE = Distinct<HW_IO, 'HW_SUBMODULE'>;        // Central hardware component
export type HW_MODULE = Distinct<HW_IO, 'HW_MODULE'>;              // Hardware module
export type HW_INTERFACE = Distinct<HW_SUBMODULE, 'HW_INTERFACE'>; // Interface component
export type HW_IEPORT = Distinct<HW_SUBMODULE, 'HW_IEPORT'>;       // Port (PN/IO)
export type HW_HSC = Distinct<HW_SUBMODULE, 'HW_HSC'>;            // High-speed counter
export type HW_PWM = Distinct<HW_SUBMODULE, 'HW_PWM'>;            // Pulse width modulation
export type HW_PTO = Distinct<HW_SUBMODULE, 'HW_PTO'>;            // Pulse encoder

// Event types
export type EVENT_ANY = Distinct<AOM_IDENT, 'EVENT_ANY'>;          // Any event
export type EVENT_ATT = Distinct<EVENT_ANY, 'EVENT_ATT'>;          // Assignable event
export type EVENT_HWINT = Distinct<EVENT_ATT, 'EVENT_HWINT'>;      // Hardware interrupt event

// Organization block types (OB_*)
export type OB_ANY = Distinct<number, 'OB_ANY'>;                   // Any organization block
export type OB_DELAY = Distinct<OB_ANY, 'OB_DELAY'>;              // Time-delay interrupt OB
export type OB_TOD = Distinct<OB_ANY, 'OB_TOD'>;                  // Time-of-day interrupt OB
export type OB_CYCLIC = Distinct<OB_ANY, 'OB_CYCLIC'>;            // Watchdog interrupt OB
export type OB_ATT = Distinct<OB_ANY, 'OB_ATT'>;                  // Dynamically assigned OB
export type OB_HWINT = Distinct<OB_ATT, 'OB_HWINT'>;             // Hardware interrupt OB
export type OB_TIMEERROR = Distinct<OB_ANY, 'OB_TIMEERROR'>;      // Time error OB
export type OB_STARTUP = Distinct<OB_ANY, 'OB_STARTUP'>;          // Startup event OB

// Connection types
export type CONN_ANY = Distinct<WORD, 'CONN_ANY'>;                // Any connection
export type CONN_PRG = Distinct<CONN_ANY, 'CONN_PRG'>;           // UDP open communication
export type CONN_OUC = Distinct<CONN_ANY, 'CONN_OUC'>;           // Industrial Ethernet communication
export type CONN_R_ID = Distinct<DWORD, 'CONN_R_ID'>;            // R_ID parameter in S7 communication

// Database types
export type DB_ANY = Distinct<number, 'DB_ANY'>;                  // Any DB identification
export type DB_WWW = Distinct<DB_ANY, 'DB_WWW'>;                 // Web-generated DB
export type DB_DYN = Distinct<DB_ANY, 'DB_DYN'>;                 // User-generated DB

// Other hardware types
export type REMOTE = Distinct<ANY, 'REMOTE'>;                     // Remote CPU address
export type PORT = Distinct<HW_SUBMODULE, 'PORT'>;               // Communication port
export type RTM = Distinct<number, 'RTM'>;                       // Operating hours counter
export type PIP = Distinct<number, 'PIP'>;                       // Synchronous Cycle

// SCL primitive type aliases
export type BOOL = Distinct<boolean, 'BOOL'> | true | false;
export type SINT = Distinct<number, 'SINT'> | number;    // 8-bit signed integer
export type USINT = Distinct<number, 'USINT'> | number;  // 8-bit unsigned integer
export type INT = Distinct<number, 'INT'> | number;      // 16-bit signed integer
export type UINT = Distinct<number, 'UINT'> | number;    // 16-bit unsigned integer
export type DINT = Distinct<number, 'DINT'> | number;    // 32-bit signed integer
export type UDINT = Distinct<number, 'UDINT'> | number;  // 32-bit unsigned integer
export type LINT = Distinct<number, 'LINT'> | number;    // 64-bit signed integer
export type ULINT = Distinct<number, 'ULINT'> | number;  // 64-bit unsigned integer
export type REAL = Distinct<number, 'REAL'> | number;
export type DWORD = Distinct<number, 'DWORD'> | number;  // 32-bit unsigned integer
export type TIME = Distinct<string, 'TIME'> | string;
export type LTIME = Distinct<string, 'LTIME'> | string;  // Long time format with nanosecond precision
export type DATE = Distinct<string, 'DATE'> | string;              // Format: YYYY-MM-DD
export type TOD = Distinct<string, 'TOD'> | string;               // TIME_OF_DAY (TOD), Format: hh:mm:ss.sss
export type LTOD = Distinct<string, 'LTOD'> | string;             // LTIME_OF_DAY, Format: hh:mm:ss.nnnnnnnnn
export type DT = Distinct<string, 'DT'> | string;                 // DATE_AND_TIME, Format: YYYY-MM-DD-hh:mm:ss.sss
export type LDT = Distinct<string, 'LDT'> | string;               // DATE_AND_LTIME, Format: YYYY-MM-DD-hh:mm:ss.nnnnnnnnn
export type DTL = Distinct<string, 'DTL'> | string;               // DTL, Format: YYYY-MM-DD-hh:mm:ss.nnnnnnnnn
export type STRING = Distinct<string, 'STRING'> | string;
export type WORD = Distinct<number, 'WORD'> | number;
export type BYTE = Distinct<number, 'BYTE'> | number;


// System data type structures
export interface IEC_TIMER {          // 16 bytes - Timer structure with TIME values
  PT: TIME;                        // Preset time
  ET: TIME;                        // Elapsed time
  IN: BOOL;                        // Timer running
  Q: BOOL;                         // Timer expired
}

export interface IEC_LTIMER {         // 32 bytes - Timer structure with LTIME values
  PT: TIME;                        // Preset time
  ET: TIME;                        // Elapsed time
  IN: BOOL;                        // Timer running
  Q: BOOL;                         // Timer expired
}

export interface IEC_SCOUNTER {       // 3 bytes - Counter with SINT values
  PV: SINT;                        // Preset value
  CV: SINT;                        // Current value
  Q: BOOL;                         // Counter reached CV ≥ PV
}

export interface IEC_USCOUNTER {      // 3 bytes - Counter with USINT values
  PV: USINT;                       // Preset value
  CV: USINT;                       // Current value
  Q: BOOL;                         // Counter reached CV ≥ PV
}

export interface IEC_COUNTER {        // 6 bytes - Counter with INT values
  PV: INT;                         // Preset value
  CV: INT;                         // Current value
  Q: BOOL;                         // Counter reached CV ≥ PV
}

export interface IEC_UCOUNTER {       // 6 bytes - Counter with UINT values
  PV: UINT;                        // Preset value
  CV: UINT;                        // Current value
  Q: BOOL;                         // Counter reached CV ≥ PV
}

export interface IEC_DCOUNTER {       // 12 bytes - Counter with DINT values
  PV: DINT;                        // Preset value
  CV: DINT;                        // Current value
  Q: BOOL;                         // Counter reached CV ≥ PV
}

export interface IEC_UDCOUNTER {      // 12 bytes - Counter with UDINT values
  PV: UDINT;                       // Preset value
  CV: UDINT;                       // Current value
  Q: BOOL;                         // Counter reached CV ≥ PV
}

export interface IEC_LCOUNTER {       // 24 bytes - Counter with LINT values
  PV: LINT;                        // Preset value
  CV: LINT;                        // Current value
  Q: BOOL;                         // Counter reached CV ≥ PV
}

export interface IEC_ULCOUNTER {      // 24 bytes - Counter with ULINT values
  PV: ULINT;                       // Preset value
  CV: ULINT;                       // Current value
  Q: BOOL;                         // Counter reached CV ≥ PV
}

export interface CREF {               // 8 bytes - Block address information
  readonly blockType: BYTE;         // Block type
  readonly blockNumber: UINT;       // Block number
  readonly offset: UDINT;          // Offset in block
}

export interface NREF {               // 8 bytes - Operand address information
  readonly operandType: BYTE;       // Operand type
  readonly operandId: UINT;         // Operand ID
  readonly offset: UDINT;          // Offset in operand
}

export interface ERROR_STRUCT {       // 28 bytes - Error information structure
  readonly errorID: WORD;          // Error ID
  readonly flags: WORD;            // Error flags
  readonly cref: CREF;             // Block related error information
  readonly nref: NREF;             // Operand related error information
}

export interface VREF {               // 12 bytes - VARIANT pointer
  readonly type: UINT;             // Data type
  readonly length: UDINT;          // Length
  readonly dbNumber: UINT;         // DB number
  readonly offset: UDINT;          // Offset in DB
}

export interface SSL_HEADER {         // 4 bytes - System status list header
  readonly index: WORD;            // SSL ID
  readonly length: WORD;           // Length of SSL data
}

export interface CONDITIONS {         // 52 bytes - Data reception conditions
  readonly startCond: BYTE;        // Start condition
  readonly endCond: BYTE;          // End condition
  readonly bufferSize: UINT;       // Buffer size
  readonly timeout: TIME;          // Timeout value
  // ... other implementation specific fields
}

export interface TADDR_Param {        // 8 bytes - UDP connection parameters
  readonly port: UINT;             // Port number
  readonly addr: DWORD;            // IP address
}

export interface TCON_Param {         // 64 bytes - TCP/IP connection parameters
  readonly blockId: BYTE;          // Block identifier
  readonly connectionType: BYTE;    // Connection type
  readonly activeEstablishment: BOOL; // Active/passive connection establishment
  readonly localTsap: WORD;        // Local TSAP
  readonly remoteTsap: WORD;       // Remote TSAP
  readonly remoteAddress: DWORD;   // Remote IP address
  // ... other implementation specific fields
}

export interface HSC_Period {         // 12 bytes - High-speed counter period
  readonly periodDuration: LTIME;   // Period duration
  readonly updateTime: LTIME;       // Update time
}

export interface AssocValues {        // 16 bytes - Associated message values
  readonly value1: DWORD;          // First associated value
  readonly value2: DWORD;          // Second associated value
  readonly value3: DWORD;          // Third associated value
  readonly value4: DWORD;          // Fourth associated value
}


// Update SCLTypeEnum to include hardware types
export enum SCLTypeEnum {
  // Primitive types
  BOOL = 'BOOL',
  SINT = 'SINT',
  USINT = 'USINT',
  INT = 'INT',
  UINT = 'UINT',
  DINT = 'DINT',
  UDINT = 'UDINT',
  LINT = 'LINT',
  ULINT = 'ULINT',
  REAL = 'REAL',
  DWORD = 'DWORD',
  TIME = 'TIME',
  LTIME = 'LTIME',
  DATE = 'DATE',
  TOD = 'TOD',
  LTOD = 'LTOD',
  DT = 'DT',
  LDT = 'LDT',
  DTL = 'DTL',
  STRING = 'STRING',
  WORD = 'WORD',
  BYTE = 'BYTE',
  VOID = 'VOID',

  // Hardware base types
  ANY = 'ANY',
  AOM_IDENT = 'AOM_IDENT',

  // Hardware identification types
  HW_ANY = 'HW_ANY',
  HW_IO = 'HW_IO',
  HW_DEVICE = 'HW_DEVICE',
  HW_DPMASTER = 'HW_DPMASTER',
  HW_DPSLAVE = 'HW_DPSLAVE',
  HW_IOSYSTEM = 'HW_IOSYSTEM',
  HW_SUBMODULE = 'HW_SUBMODULE',
  HW_MODULE = 'HW_MODULE',
  HW_INTERFACE = 'HW_INTERFACE',
  HW_IEPORT = 'HW_IEPORT',
  HW_HSC = 'HW_HSC',
  HW_PWM = 'HW_PWM',
  HW_PTO = 'HW_PTO',

  // Event types
  EVENT_ANY = 'EVENT_ANY',
  EVENT_ATT = 'EVENT_ATT',
  EVENT_HWINT = 'EVENT_HWINT',

  // Organization block types
  OB_ANY = 'OB_ANY',
  OB_DELAY = 'OB_DELAY',
  OB_TOD = 'OB_TOD',
  OB_CYCLIC = 'OB_CYCLIC',
  OB_ATT = 'OB_ATT',
  OB_HWINT = 'OB_HWINT',
  OB_TIMEERROR = 'OB_TIMEERROR',
  OB_STARTUP = 'OB_STARTUP',

  // Connection types
  CONN_ANY = 'CONN_ANY',
  CONN_PRG = 'CONN_PRG',
  CONN_OUC = 'CONN_OUC',
  CONN_R_ID = 'CONN_R_ID',

  // Database types
  DB_ANY = 'DB_ANY',
  DB_WWW = 'DB_WWW',
  DB_DYN = 'DB_DYN',

  // Other hardware types
  REMOTE = 'REMOTE',
  PORT = 'PORT',
  RTM = 'RTM',
  PIP = 'PIP',
}

// Interfaces
export interface ArrayDimension {
  readonly start: number;
  readonly end: number;
}

export interface BaseOptions {
  readonly name: string;
}

export interface SCLBlockOptions extends BaseOptions {
  readonly category: SCLCategory;
  readonly optimizedAccess?: boolean;
  readonly author?: string;
  readonly family?: string;
  readonly version?: string;
  readonly dbAccessibleFromOPCUA?: boolean;
  readonly dbAccessibleFromWebserver?: boolean;
  readonly readOnly?: boolean;
  readonly unlinked?: boolean;
  readonly nonRetain?: boolean;
  readonly returnType?: SCLTypeEnum | string;
  readonly instanceType?: SCLInstanceType;
}

export interface SCLPropertyOptions extends BaseOptions {
  readonly sclType?: string;
  readonly initValue?: any;
  readonly scope?: SCLVarType;
  readonly dimensions?: ReadonlyArray<ArrayDimension>;
  readonly externalVisible?: boolean;
  readonly externalWritable?: boolean;
  readonly externalAccessible?: boolean;
  readonly retain?: boolean;
  readonly s7SetPoint?: boolean;
  readonly instanceType?: SCLInstanceType;

}

// Helper functions
export const dim = (start: number, end: number): ArrayDimension => ({ start, end });
export type SCLInstanceType = 'single' | 'multiple' | 'parameter';
// TimeValue class
