# Contributing to Paideia

Thank you for contributing to Paideia.

Paideia is an experimental inspectable AI-native runtime framework for generated systems.

## Core Principles

Changes should preserve:

- inspectability
- operational clarity
- secure defaults
- explicit contracts
- minimal trusted runtime surface
- understandable generated output

Generated software must remain understandable. Changes that add power should also preserve inspectability, diagnostics, and secure defaults.

## Development

Run the development runtime:

```bash
paideia dev
```

Build artifacts:

```bash
paideia build
```

Run diagnostics:

```bash
paideia doctor
```

## Before Opening a Pull Request

Please verify:

```bash
paideia build
paideia doctor
```

## Scope

Paideia intentionally favors:

- small runtime surfaces
- explicit contracts
- visible runtime behavior
- stable CLI lifecycle

Please avoid introducing:

- unnecessary dependencies
- hidden runtime behavior
- implicit network behavior
- production-only magic
