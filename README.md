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
│   │   └── types/      # Type definitions
│   ├── utils/          # Utility functions
│   ├── sample/         # Sample code and examples
│   └── __tests__/      # Test files
├── dist/               # Compiled JavaScript output
└── ...
```

## Installation

```bash
# Install from npm
npm install ts2scl

# Or clone and install dependencies
git clone https://github.com/yourusername/ts2scl.git
cd ts2scl
npm install
```

## Usage

### Basic Usage

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

# Lint code
npm run lint

# Format code
npm run format
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT
