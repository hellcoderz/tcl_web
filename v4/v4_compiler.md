# TCL-Web AST-to-Bytecode Compiler (v4)

## 1. Introduction

This document specifies the design of the TCL-Web compiler. The compiler's role is to transform the Abstract Syntax Tree (AST), produced by the parser, into a linear sequence of bytecode instructions that can be executed by the TCL-Web Virtual Machine (VM).

This compilation step is the crucial link between the high-level, structured representation of the code (AST) and the low-level, efficient format required for execution (bytecode). The process follows the pipeline: `AST -> Compiler -> Bytecode`.

The compiler is implemented as a recursive, tree-walking visitor that processes each node in the AST and emits corresponding bytecode.

## 2. Compiler Architecture

The compiler can be encapsulated in a `Compiler` class.

### 2.1. Core Components

*   **`Compiler` Class**: The main entity responsible for the compilation process.
    *   **`constants`**: An array that serves as the constants pool. It stores all unique literal values (strings, numbers) and compiled code blocks to avoid duplication.
    *   **`bytecode`**: An array of instruction arrays, representing the compiled output.

*   **Main Methods**:
    *   `compile(ast)`: The main entry point. It takes the root `Program` node of the AST, iterates through its body, and returns the finished `bytecode` and `constants`.
    *   `compileCommand(commandNode)`: A dispatcher that selects the correct compilation logic based on the command's name.
    *   `addConstant(value)`: A helper method that adds a value to the `constants` pool if it's not already present and returns its index.
    *   `emit(opcode, ...operands)`: A helper that appends a fully formed instruction to the `bytecode` array.

### 2.2. Recursive Compilation for Blocks

To handle nested blocks (like in `bind`, `watch`, `proc`), the compiler is invoked recursively. A new `Compiler` instance is created to compile the body of a block. This generates a self-contained `bytecode` chunk and `constants` pool, which are then added as a single constant to the parent compiler's pool.

## 3. Compiling AST Nodes to Bytecode

The compiler traverses the AST provided by the parser (`v4_parser.md`) and translates each `Command` node into instructions from the instruction set (`v4_bytecode.md`).

### 3.1. Compiling Arguments

Before compiling a command, its arguments must be processed and placed onto the VM's stack.

*   **`StringLiteral` / `NumberLiteral`**: The value is added to the constants pool. Emit `[PUSH_CONST, <index>]`.
*   **`Identifier`**: The identifier's string value is added to the constants pool. Emit `[PUSH_CONST, <index>]`.
*   **`VariableSubstitution`**: The variable name is added to the constants pool. Emit `[PUSH_VAR, <index_of_var_name>]`.

### 3.2. Compiling Commands

#### `set <variable> <value>`
*   **AST**: `Command(name: "set", args: [Identifier, Literal])`
*   **Logic**:
    1.  Compile the value argument (arg 2) and push it to the stack.
    2.  Compile the variable name (arg 1) and push it to the stack.
    3.  Emit `[SET_STATE]`.

#### Widget Creation (`l`, `b`, `input`, etc.)
*   **AST**: `Command(name: "b", args: [Identifier("add_btn"), StringLiteral("Add")])`
*   **Logic**:
    1.  The compiler creates an options object from the arguments (e.g., `{ label: "Add" }`).
    2.  `addConstant({ label: "Add" })` -> `c1`
    3.  `addConstant("BUTTON")` -> `c2`
    4.  `addConstant("add_btn")` -> `c3`
    5.  Emit `[PUSH_CONST, c1]`
    6.  Emit `[PUSH_CONST, c2]`
    7.  Emit `[PUSH_CONST, c3]`
    8.  Emit `[CREATE_WIDGET]`

#### `config` and `pack`
*   **AST**: `Command(name: "conf", args: [Identifier, Option, Literal, ...])`
*   **Logic**:
    1.  Iterate through the key-value pairs in `args` (from index 1 onwards).
    2.  For each pair, compile the value, then compile the key (the `Option` as a string).
    3.  Emit `[BUILD_OBJ, <number_of_pairs>]`.
    4.  Compile the widget name (arg 0).
    5.  Emit `[UPDATE_WIDGET]` or `[PACK_WIDGET]`.

### 3.3. Compiling Block Commands

#### `bind <widget>`
*   **AST**: `Command(name: "bind", body: [Command(name: ".click", body: [...])])`
*   **Logic**:
    1.  For each event command (e.g., `.click`) in the `bind` command's body:
        a. Recursively compile the event's `body` into a `bytecode_chunk`.
        b. `addConstant(bytecode_chunk)` -> `c_block`.
        c. Emit `[DEF_BLOCK, c_block]`.
        d. `addConstant(".click")` -> `c_event`.
        e. Emit `[PUSH_CONST, c_event]`.
    2.  Compile the widget name.
    3.  Emit `[BIND_WIDGET, <number_of_events>]`.

#### `watch <variable>`
*   **AST**: `Command(name: "watch", args: [Identifier], body: [...])`
*   **Logic**:
    1.  Recursively compile the `body` into a `bytecode_chunk`.
    2.  `addConstant(bytecode_chunk)` -> `c_block`.
    3.  Emit `[DEF_BLOCK, c_block]`.
    4.  Compile the variable name from `args`.
    5.  Emit `[WATCH_STATE]`.

## 4. Compiler Pseudocode

```javascript
class Compiler {
  constructor() {
    this.bytecode = [];
    this.constants = [];
  }

  addConstant(value) { /* Finds or adds value, returns index */ }
  emit(opcode, ...operands) { this.bytecode.push([opcode, ...operands]); }

  compile(programNode) {
    for (const command of programNode.body) {
      this.compileCommand(command);
    }
    return { bytecode: this.bytecode, constants: this.constants };
  }

  compileArg(argNode) {
    if (argNode.type === 'VariableSubstitution') {
      const constIndex = this.addConstant(argNode.name);
      this.emit('PUSH_VAR', constIndex);
    } else {
      const constIndex = this.addConstant(argNode.value);
      this.emit('PUSH_CONST', constIndex);
    }
  }

  compileCommand(command) {
    const name = command.name.value;
    switch (name) {
      case 'set':
        this.compileArg(command.args[1]); // value
        this.compileArg(command.args[0]); // name
        this.emit('SET_STATE');
        break;

      case 'conf':
      case 'pack':
        const options = command.args.slice(1);
        for (let i = 0; i < options.length; i += 2) {
          this.compileArg(options[i+1]); // value
          this.compileArg(options[i]);   // key
        }
        this.emit('BUILD_OBJ', options.length / 2);
        this.compileArg(command.args[0]); // widget name
        this.emit(name === 'conf' ? 'UPDATE_WIDGET' : 'PACK_WIDGET');
        break;

      case 'bind':
        for (const eventCmd of command.body) {
            const blockCompiler = new Compiler();
            const blockResult = blockCompiler.compile(eventCmd); // Compile the inner block
            const blockConstIndex = this.addConstant(blockResult);
            this.emit('DEF_BLOCK', blockConstIndex);
            this.compileArg(eventCmd.name);
        }
        this.compileArg(command.args[0]); // widget name
        this.emit('BIND_WIDGET', command.body.length);
        break;

      // ... other cases
    }
  }
}
```

## 5. Conclusion

The compiler is a methodical translator. It walks the hierarchical AST and flattens it into a linear, efficient set of bytecode instructions. By mapping each AST `Command` node to a specific sequence of opcodes, it provides a predictable and optimizable input for the final execution stage in the Virtual Machine.