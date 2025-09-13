# TCL-Web Bytecode Compiler Design (v4)

## 1. Introduction

This document proposes an alternative execution model for TCL-Web using a bytecode compiler and a Virtual Machine (VM). Instead of a tree-walking interpreter that processes the AST directly, this approach first compiles the AST into a compact, linear bytecode format. A lightweight VM then executes this bytecode.

This can offer performance advantages by reducing the overhead of tree traversal and string comparisons during runtime. The compilation process is: `Source Code -> Parser -> AST -> Compiler -> Bytecode`. The runtime process is: `Bytecode -> VM -> DOM`.

## 2. Bytecode and VM Architecture

### 2.1. Instruction Set

The bytecode is a simple array of instructions. Each instruction is itself an array containing an `Opcode` (a number) and zero or more operands. A new `BUILD_OBJ` opcode is introduced to handle the flexible key-value arguments of commands like `config` and `pack`.

| Opcode             | Operands                  | Description                                                              |
| ------------------ | ------------------------- | ------------------------------------------------------------------------ |
| `PUSH_CONST`       | `const_index`             | Pushes a value from the constants pool onto the stack.                   |
| `PUSH_VAR`         | `var_name_index`          | Pushes the value of a state variable onto the stack.                     |
| `POP`              |                           | Pops the top value from the stack.                                       |
| `SET_STATE`        |                           | Pops a value and a variable name; sets the state variable.               |
| `BUILD_OBJ`        | `key_count`               | Pops `key_count * 2` values (key, value, key, value...) and pushes a single object. |
| `CREATE_WIDGET`    |                           | Pops name, type, and an options object; creates a widget.                |
| `UPDATE_WIDGET`    |                           | Pops a widget name and an options object; configures a widget.           |
| `PACK_WIDGET`      |                           | Pops a widget name and an options object; packs a widget.                |
| `DEF_BLOCK`        | `bytecode_chunk_index`    | Pushes a reference to a compiled code block onto the stack.              |
| `BIND_WIDGET`      | `event_count`             | Binds `event_count` events to a widget. Expects `(block, event, name)` on stack for each. |
| `WATCH_STATE`      |                           | Pops a block and a variable name; sets up a state watcher.               |
| `DEF_PROC`         | `arg_count`               | Defines a procedure. Pops name, followed by `arg_count` arg names, and a block. |
| `CALL_PROC`        | `arg_count`               | Calls a procedure. Pops procedure name and `arg_count` arguments.        |
| `HTTP_GET`         | `callback_count`          | Pops URL, then `callback_count` blocks/names. Makes GET request.         |

### 2.2. The Virtual Machine (VM)

The VM is responsible for executing the bytecode. It has three main components:
1.  **Instruction Pointer (IP):** Tracks the current position in the bytecode array.
2.  **Operand Stack:** A simple array used for passing data between instructions.
3.  **`TCLWebRuntime`:** The same runtime object used by the interpreter, which the VM calls to interact with the DOM and application state.

The VM runs in a loop: fetch instruction at IP, decode, execute, increment IP. When it sees `BUILD_OBJ`, it pops the specified number of values and constructs a JavaScript object.

## 3. AST-to-Bytecode Compiler

The compiler is a function that traverses the AST and emits bytecode.

### 3.1. The Compiler's State
*   `bytecode`: The main array of instructions being generated.
*   `constants`: A pool of unique constant values (strings, numbers, and even other bytecode chunks). This avoids data duplication. The `PUSH_CONST` instruction uses an index into this pool.

### 3.2. Compilation Logic

The compiler recursively walks the AST. For each `Command` node, it emits instructions.

**`set new_todo_text ""`**
1.  Emit: `[PUSH_CONST, <index_of_"">]`
2.  Emit: `[PUSH_CONST, <index_of_"new_todo_text">]`
3.  Emit: `[SET_STATE]`

**`b add_button "Add Todo"`**
1.  Emit: `[PUSH_CONST, <index_of_{label: "Add Todo"}>]`
2.  Emit: `[PUSH_CONST, <index_of_"BUTTON">]`
3.  Emit: `[PUSH_CONST, <index_of_"add_button">]`
4.  Emit: `[CREATE_WIDGET]`

**`conf my_label -text "New Text" -bg "blue"`**
This uses `BUILD_OBJ` to create the options object.
1.  Emit: `[PUSH_CONST, <index_of_"New Text">]`
2.  Emit: `[PUSH_CONST, <index_of_"-text">]`
3.  Emit: `[PUSH_CONST, <index_of_"blue">]`
4.  Emit: `[PUSH_CONST, <index_of_"-bg">]`
5.  Emit: `[BUILD_OBJ, 2]` // Creates { "-text": "New Text", "-bg": "blue" }
6.  Emit: `[PUSH_CONST, <index_of_"my_label">]`
7.  Emit: `[UPDATE_WIDGET]`

**`pack my_label -side top -fill x`**
This is identical in structure to `conf`.
1.  Emit: `[PUSH_CONST, <index_of_"top">]`
2.  Emit: `[PUSH_CONST, <index_of_"-side">]`
3.  Emit: `[PUSH_CONST, <index_of_"x">]`
4.  Emit: `[PUSH_CONST, <index_of_"-fill">]`
5.  Emit: `[BUILD_OBJ, 2]`
6.  Emit: `[PUSH_CONST, <index_of_"my_label">]`
7.  Emit: `[PACK_WIDGET]`

### 3.3. Compiling Blocks

Blocks (for `bind`, `watch`, `proc`, `http.get`) are compiled into their own separate bytecode chunks, which are stored in the constants pool.

**`bind my_button`**
```tcl
bind my_button
  .click
    alert "Clicked!"
  .mouseover
    conf my_button -bg "lightblue"
```
1.  Recursively compile the `.click` body into `click_bytecode`.
2.  Recursively compile the `.mouseover` body into `mouseover_bytecode`.
3.  Add `click_bytecode` to constants pool at index `c_click`.
4.  Add `mouseover_bytecode` to constants pool at index `c_mouseover`.
5.  Emit: `[DEF_BLOCK, c_click]`
6.  Emit: `[PUSH_CONST, <index_of_".click">]`
7.  Emit: `[DEF_BLOCK, c_mouseover]`
8.  Emit: `[PUSH_CONST, <index_of_".mouseover">]`
9.  Emit: `[PUSH_CONST, <index_of_"my_button">]`
10. Emit: `[BIND_WIDGET, 2]` // Binding 2 events

**`watch todos`**
```tcl
watch todos
  conf todo_list -items {$todos}
```
1.  Recursively compile the body into `watch_bytecode`.
2.  Add `watch_bytecode` to constants pool at index `c_watch`.
3.  Emit: `[DEF_BLOCK, c_watch]`
4.  Emit: `[PUSH_CONST, <index_of_"todos">]`
5.  Emit: `[WATCH_STATE]`

**`proc greet name`**
```tcl
proc greet name
  alert "Hello, {name}"
```
1.  Compile the proc body into `greet_bytecode`.
2.  Add `greet_bytecode` to constants pool at index `c_greet`.
3.  Emit: `[DEF_BLOCK, c_greet]`
4.  Emit: `[PUSH_CONST, <index_of_"name">]`
5.  Emit: `[PUSH_CONST, <index_of_"greet">]`
6.  Emit: `[DEF_PROC, 1]` // Defining a proc with 1 argument

**`http.get "url"`**
```tcl
http.get "https://..."
  .callback
    set posts {$http_response}
```
1.  Compile `.callback` body into `cb_bytecode`.
2.  Add `cb_bytecode` to constants pool at index `c_cb`.
3.  Emit: `[DEF_BLOCK, c_cb]`
4.  Emit: `[PUSH_CONST, <index_of_".callback">]`
5.  Emit: `[PUSH_CONST, <index_of_"https://...">]`
6.  Emit: `[HTTP_GET, 1]` // 1 callback block

## 4. Example Execution

**TCL:**
```tcl
set name "World"
l greeting "Hello"
```

**Compiler Output:**
```javascript
const constants = [
  "World",        // 0
  "name",         // 1
  { "initialText": "Hello" }, // 2
  "greeting",     // 3
  "LABEL"         // 4
];

const bytecode = [
  [PUSH_CONST, 0], // PUSH "World"
  [PUSH_CONST, 1], // PUSH "name"
  [SET_STATE],     // runtime.setState("name", "World")
  
  [PUSH_CONST, 2], // PUSH { initialText: "Hello" }
  [PUSH_CONST, 4], // PUSH "LABEL"
  [PUSH_CONST, 3], // PUSH "greeting"
  [CREATE_WIDGET]
];
```
*(Note: The order of pushes for `CREATE_WIDGET` is options, type, name for easier processing by the VM)*.

## 5. Comprehensive Example: Todo App Snippet

**TCL:**
```tcl
set todos [list "Learn TCL-Web"]
set new_todo_text ""
b add_button "Add Todo"
bind add_button
  .click
    lappend todos {$new_todo_text}
    set new_todo_text ""
```

**Compiler Output (Conceptual):**
```javascript
const constants = [
  ["Learn TCL-Web"],          // 0
  "todos",                    // 1
  "",                         // 2
  "new_todo_text",            // 3
  { "label": "Add Todo" },    // 4
  "BUTTON",                   // 5
  "add_button",               // 6
  // Bytecode for the .click block
  [ /* 7: click_bytecode */
    [PUSH_VAR, 3],   // PUSH value of new_todo_text
    [PUSH_CONST, 1],   // PUSH "todos"
    [LAPPEND],       // Special opcode for list append
    [PUSH_CONST, 2],   // PUSH ""
    [PUSH_CONST, 3],   // PUSH "new_todo_text"
    [SET_STATE]
  ],
  ".click"                    // 8
];

const bytecode = [
  // set todos [list "Learn TCL-Web"]
  [PUSH_CONST, 0],
  [PUSH_CONST, 1],
  [SET_STATE],
  // set new_todo_text ""
  [PUSH_CONST, 2],
  [PUSH_CONST, 3],
  [SET_STATE],
  // b add_button "Add Todo"
  [PUSH_CONST, 4],
  [PUSH_CONST, 5],
  [PUSH_CONST, 6],
  [CREATE_WIDGET],
  // bind add_button .click ...
  [DEF_BLOCK, 7],
  [PUSH_CONST, 8],
  [PUSH_CONST, 6],
  [BIND_WIDGET, 1]
];
```
This expanded design provides a more complete blueprint for compiling the full range of TCL-Web v4 features into an efficient bytecode representation.
