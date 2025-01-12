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

## Installation

```bash
npm install
```

## Usage

```bash
npm run build
npm test
```

## Type Mappings

TypeScript to SCL type mappings:

| TypeScript | SCL |
|------------|-----|
| number (int) | INT |
| number (float) | REAL |
| boolean | BOOL |
| string | STRING |
| Array<T> | ARRAY[x..y] OF T |
| interface/class | STRUCT |

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build project
npm run build
```

## License

ISC 