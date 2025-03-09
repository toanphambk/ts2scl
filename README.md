# TS2SCL

A TypeScript to Siemens SCL converter that transforms TypeScript types and structures into equivalent SCL (Structured Control Language) code for Siemens TIA Portal.

## Features

- Converts TypeScript types to SCL types
- Supports:
  - Basic types (number, boolean, string)
  - Arrays (1D, 2D, and 3D)
  - Complex structures and nested types
  - Enums
  - Type aliases
- Generates SCL code for:
  - Data Blocks (DBs)
  - Function Blocks (FBs)
  - Functions (FCs)

## Project Structure

```
ts2scl/
├── src/
│   ├── core/           # Core conversion functionality
│   │   ├── base/       # Base classes and interfaces
│   │   ├── compilers/  # Type compilers
│   │   ├── generators/ # SCL code generators
│   │   ├── types/      # Type definitions and decorators
│   │   └── index.ts    # Main compiler entry point
│   └── utils/          # Utility functions
├── dist/               # Compiled JavaScript output
└── ...
```

## Installation

```bash
# Install from npm
npm install ts2scl

# Or clone and install dependencies
git clone https://github.com/toanphambk/ts2scl.git
cd ts2scl
npm install
```

## Usage

### Using the CLI

```bash
# Build the project
npm run build

# Run tests
npm test
```

### API Usage

```typescript
import { convertTypeToSCL } from 'ts2scl';

// Define your TypeScript type
interface Motor {
  speed: number;
  isRunning: boolean;
  name: string;
}

// Convert to SCL
const sclCode = convertTypeToSCL<Motor>('Motor');
console.log(sclCode);
```

### Using Decorators

```typescript
import { SCLType, SCLArray, BOOL, INT, REAL, dim } from 'ts2scl';

@SCLType()
export class MotorConfig {
  SPEED_SETPOINT: REAL;
  IS_RUNNING: BOOL;

  @SCLArray([dim(0, 9)])
  SPEED_HISTORY: INT[];
}
```

### Creating Data Blocks

```typescript
import { SCLDb, Retain, BOOL, INT, TIME } from 'ts2scl';
import { MotorConfig } from './types';

@SCLDb({
  version: '1.0',
  optimizedAccess: true,
  dbAccessibleFromOPCUA: true,
})
export class MotorDB {
  @Retain()
  public CONFIG: MotorConfig;

  @Retain()
  public CYCLE_COUNT: INT;

  public LAST_CYCLE_TIME: TIME;
}
```

### Creating Function Blocks

```typescript
import { SCLFB, Static, Input, Output, Retain, BOOL, INT } from 'ts2scl';
import { MotorInput, MotorOutput } from './types';

@SCLFB()
export class MotorController {
  @Static()
  @Retain()
  public lastSpeed: INT;

  public exec(@Input({}) input: MotorInput, @Output({}) output: MotorOutput): void {
    // Function block implementation
  }
}
```

## Type Mappings

TypeScript to SCL type mappings:

| TypeScript      | SCL              |
| --------------- | ---------------- |
| number (int)    | INT              |
| number (float)  | REAL             |
| boolean         | BOOL             |
| string          | STRING           |
| Array<T>        | ARRAY[x..y] OF T |
| interface/class | STRUCT           |
| enum            | INT              |

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build project
npm run build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Author

- Toan Pham - [toanphambk@gmail.com](mailto:toanphambk@gmail.com)

## License

MIT
