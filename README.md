# TS2SCL - TypeScript to Siemens SCL Converter Boilerplate

A boilerplate project for converting TypeScript code to Siemens Structured Control Language (SCL) for use in Siemens TIA Portal and PLC programming.

## Overview

TS2SCL is a boilerplate that allows you to write your PLC logic in TypeScript with special decorators and type annotations, then automatically converts it to SCL code that can be imported into Siemens TIA Portal. This approach brings modern programming practices, type safety, and better tooling to PLC development.

## Features

- Convert TypeScript classes to SCL User-Defined Types (UDTs)
- Convert TypeScript functions to SCL Functions (FCs)
- Convert TypeScript classes with methods to SCL Function Blocks (FBs)
- Convert TypeScript variables to SCL Data Blocks (DBs)
- Support for arrays with multiple dimensions
- Support for complex data types and nested structures
- Type-safe development with TypeScript's static type checking

## Getting Started

1. Clone this repository:

```bash
git clone https://github.com/toanphambk/ts2scl.git
cd ts2scl
```

2. Install dependencies:

```bash
npm install
```

3. Write your PLC logic in TypeScript using the provided decorators and types in the `src/logic` directory
4. Build the project to generate SCL code:

```bash
npm run build
```

5. Find the generated SCL files in the `outScl` directory
6. Import the generated SCL files into TIA Portal

## Project Structure

- `src/logic/` - Place your TypeScript PLC logic files here
- `src/ts2scl/` - The core converter implementation
- `outScl/` - Generated SCL output files

## Usage Example

### Define Types (UDTs)

```typescript
// src/logic/sample-types.ts
import { SCLType, SCLArray } from '../ts2scl/core/types/decorators';
import { BOOL, INT, TIME, STRING, dim, REAL } from '../ts2scl/core/types/types';

@SCLType()
export class MotorConfig {
  SPEED_SETPOINT: REAL;
  ACCELERATION: REAL;
  MAX_SPEED: REAL;
  RAMP_TIME: TIME;
}
```

### Define Function Blocks (FBs)

```typescript
// src/logic/sample-fb.ts
import { SCLFunctionBlock, Input, Output, Static } from '../ts2scl/core/types/decorators';
import { INT, BOOL, WORD } from '../ts2scl/core/types/types';
import { DriveControllerInput, DriveControllerOutput } from './sample-types';

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

  initialize() {
    this.lastSpeed = 0;
    this.output.STATUS_WORD = 0;
  }

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
    return this.input.SETPOINT;
  }
}
```

## License

MIT

## Author

Toan Pham <toanphambk@gmail.com>
