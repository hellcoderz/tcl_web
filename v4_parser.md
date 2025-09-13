# TCL-Web Parser Design (v4)

## 1. Introduction

This document outlines the design for a parser that transforms TCL-Web source code into an Abstract Syntax Tree (AST). The parser is designed to handle the indentation-based syntax introduced in TCL-Web v4.

The primary goal of the parser is to create a structured, hierarchical representation of the code that can be easily consumed by a compiler or interpreter for translation into JavaScript.

## 2. Abstract Syntax Tree (AST) Structure

The AST will be a tree of nodes, with a single `Program` node at the root.

### 2.1. Node Types

#### `Program`
The root node of the AST.
```json
{
  "type": "Program",
  "body": [ ...list of Command nodes... ]
}
```

#### `Command`
Represents a single line of code, which is a command and its arguments. If the command initiates a block, it will have a `body` property containing the commands within that block.
```json
{
  "type": "Command",
  "name": { "type": "Identifier", "value": "command_name" },
  "args": [ ...list of Argument nodes... ],
  "body": [ ...list of child Command nodes... ]
}
```

#### `Argument` Nodes
Arguments can be of several types:

*   **`Identifier`**: An unquoted word (e.g., a widget name, a variable name).
    ```json
    { "type": "Identifier", "value": "my_button" }
    ```
*   **`StringLiteral`**: A value enclosed in double quotes.
    ```json
    { "type": "StringLiteral", "value": "Hello World" }
    ```
*   **`VariableSubstitution`**: A variable reference like `{$var}`.
    ```json
    { "type": "VariableSubstitution", "name": "todos" }
    ```
*   **`Option`**: A configuration flag starting with a hyphen.
    ```json
    { "type": "Option", "value": "-side" }
    ```

## 3. Parser Architecture

The parsing process is broken down into two main phases:

1.  **Line Analysis:** The source code is read line-by-line. Each line is processed to determine its indentation level and is broken into a list of tokens. Comments and empty lines are discarded.
2.  **Tree Construction:** The flat list of processed lines is then used to build the hierarchical AST. A stack is used to manage the nesting of blocks based on indentation changes.

### 3.1. Phase 1: Line Analysis

For each line in the source code:
1.  **Calculate Indentation:** Count the number of leading spaces. Each level of indentation is 2 spaces. The indentation level is `(number of spaces) / 2`. An error is thrown if the number of spaces is not a multiple of 2.
2.  **Tokenize:** Split the trimmed line by spaces. Handle quoted strings (`"..."`) as a single token.
3.  **Filter:** Ignore empty lines and lines that are only comments (starting with `#`).
4.  **Output:** Create a `Line` object containing the indentation level and the list of tokens.

**Example `Line` object:**
```
// Source:   conf my_label -text "New Text"
{
  "indent": 1,
  "tokens": ["conf", "my_label", "-text", "New Text"]
}
```

### 3.2. Phase 2: Tree Construction

This phase uses a stack-based algorithm to build the tree from the `Line` objects.

1.  **Initialization:**
    *   Create a root `Program` node.
    *   Create a stack and push the `Program` node's `body` array onto it. This stack will hold references to the `body` arrays of the nodes we are currently building.
    *   Initialize `current_indent = 0`.

2.  **Iteration:** Process each `Line` object from Phase 1.
    *   Create a new `Command` node from the line's tokens.
    *   **Compare Indentation:**
        *   **`line.indent > current_indent`**: This signifies the start of a new block.
            *   Check that the increase is only by one level (`line.indent === current_indent + 1`).
            *   Get the last command added to the `body` array at the top of the stack.
            *   Initialize its `body` array (e.g., `last_command.body = []`).
            *   Push the new `body` array onto the stack.
            *   Add the new `Command` to this new `body`.
        *   **`line.indent < current_indent`**: This signifies the end of one or more blocks.
            *   Pop from the stack `(current_indent - line.indent)` times.
            *   Add the new `Command` to the `body` array now at the top of the stack.
        *   **`line.indent === current_indent`**: This is another command in the same block.
            *   Add the new `Command` to the `body` array at the top of the stack.
    *   **Update State:** Set `current_indent = line.indent`.

3.  **Finalization:** After processing all lines, the `Program` node will contain the complete AST.

## 4. Example

Consider this TCL-Web code snippet:

```tcl
# 5. Actions and Bindings
bind add_button
  .click
    lappend todos {$new_todo_text}
    set new_todo_text ""
```

### AST Representation (JSON)

The parser would generate the following AST for this snippet:

```json
{
  "type": "Program",
  "body": [
    {
      "type": "Command",
      "name": { "type": "Identifier", "value": "bind" },
      "args": [
        { "type": "Identifier", "value": "add_button" }
      ],
      "body": [
        {
          "type": "Command",
          "name": { "type": "Identifier", "value": ".click" },
          "args": [],
          "body": [
            {
              "type": "Command",
              "name": { "type": "Identifier", "value": "lappend" },
              "args": [
                { "type": "Identifier", "value": "todos" },
                { "type": "VariableSubstitution", "name": "new_todo_text" }
              ],
              "body": null
            },
            {
              "type": "Command",
              "name": { "type": "Identifier", "value": "set" },
              "args": [
                { "type": "Identifier", "value": "new_todo_text" },
                { "type": "StringLiteral", "value": "" }
              ],
              "body": null
            }
          ]
        }
      ]
    }
  ]
}
```