# TS2SCL - TypeScript to Siemens SCL Converter

A powerful tool that converts TypeScript code to Siemens Structured Control Language (SCL) for use in Siemens TIA Portal and PLC programming.

## Overview

TS2SCL allows you to write your PLC logic in TypeScript with special decorators and type annotations, then automatically converts it to SCL code that can be imported into Siemens TIA Portal. This approach brings modern programming practices, type safety, and better tooling to PLC development.

## Features

- Convert TypeScript classes to SCL User-Defined Types (UDTs)
- Convert TypeScript functions to SCL Functions (FCs)
- Convert TypeScript classes with methods to SCL Function Blocks (FBs)
- Convert TypeScript variables to SCL Data Blocks (DBs)
- Support for arrays with multiple dimensions
- Support for complex data types and nested structures
- Type-safe development with TypeScript's static type checking

## Installation

```bash
npm install -g ts2scl
```

## Usage

1. Write your PLC logic in TypeScript using the provided decorators and types
2. Run the converter to generate SCL code
3. Import the generated SCL files into TIA Portal

### Basic Example

```typescript
// Define a UDT (User-Defined Type)
@SCLType()
export class MotorConfig {
  SPEED_SETPOINT: REAL;
  ACCELERATION: REAL;
  MAX_SPEED: REAL;
  RAMP_TIME: TIME;
}

// Define a Function Block
@SCLFunctionBlock()
export class DriveController {
  // Input variables
  @Input()
  input: DriveControllerInput;

  // Output variables
  @Output()
  output: DriveControllerOutput;

  // Static variables
  @Static()
  lastSpeed: INT = 0;

  // Methods become SCL code blocks
  @OnStart()
  initialize() {
    this.lastSpeed = 0;
    this.output.STATUS_WORD = 0;
  }

  @OnCycle()
  process() {
    if (this.input.ENABLE) {
      this.output.SPEED = this.calculateSpeed();
      this.output.STATUS_WORD = 1;
    } else {
      this.output.SPEED = 0;
      this.output.STATUS_WORD = 0;
    }
  }

  calculateSpeed(): INT {
    // Implementation
    return this.input.SETPOINT;
  }
}
```

## Command Line Interface

```bash
ts2scl --input src/logic --output outScl
```

## Development

To build the project from source:

```bash
git clone https://github.com/yourusername/ts2scl.git
cd ts2scl
npm install
npm run build
```

## License

MIT

## Author

Toan Pham <toanphambk@gmail.com>
