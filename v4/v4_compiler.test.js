import {
  assertEquals,
} from "https://deno.land/std@0.224.0/testing/asserts.ts";
import Parser from "./v4_parser.js";
import Compiler, { Opcodes } from "./v4_compiler.js";

// Helper function to quickly parse and compile
function parseAndCompile(code) {
    const parser = new Parser();
    const compiler = new Compiler();
    const ast = parser.parse(code);
    return compiler.compile(ast);
}

Deno.test("Compiler Unit: 'set' command", () => {
    const { bytecode, constants } = parseAndCompile(`set my_var "hello"`);

    assertEquals(constants.includes("hello"), true);
    assertEquals(constants.includes("my_var"), true);

    const expectedBytecode = [
        [Opcodes.PUSH_CONST, constants.indexOf("hello")],
        [Opcodes.PUSH_CONST, constants.indexOf("my_var")],
        [Opcodes.SET_STATE],
    ];

    assertEquals(bytecode, expectedBytecode);
});

Deno.test("Compiler Unit: 'conf' command with BUILD_OBJ", () => {
    const { bytecode, constants } = parseAndCompile(`conf my_widget -text "hi" -bg "blue"`);
    
    const expectedBytecode = [
        [Opcodes.PUSH_CONST, constants.indexOf("hi")],
        [Opcodes.PUSH_CONST, constants.indexOf("-text")],
        [Opcodes.PUSH_CONST, constants.indexOf("blue")],
        [Opcodes.PUSH_CONST, constants.indexOf("-bg")],
        [Opcodes.BUILD_OBJ, 2],
        [Opcodes.PUSH_CONST, constants.indexOf("my_widget")],
        [Opcodes.UPDATE_WIDGET],
    ];

    assertEquals(bytecode, expectedBytecode);
});

Deno.test("Compiler Unit: 'watch' command with DEF_BLOCK", () => {
    const { bytecode, constants } = parseAndCompile(`watch my_var\n  set other_var 1`);

    // Find the compiled block in the constants pool
    const block = constants.find(c => typeof c === 'object' && c.bytecode);
    assertEquals(block.bytecode.length, 3); // PUSH 1, PUSH other_var, SET_STATE

    const expectedBytecode = [
        [Opcodes.DEF_BLOCK, constants.indexOf(block)],
        [Opcodes.PUSH_CONST, constants.indexOf("my_var")],
        [Opcodes.WATCH_STATE],
    ];

    assertEquals(bytecode, expectedBytecode);
});

Deno.test("Compiler Integration: Todo App", () => {
    const code = `
set todos [list "Learn TCL-Web"]
set new_todo_text ""
b add_button "Add Todo"
bind add_button
  .click
    lappend todos {$new_todo_text}
    set new_todo_text ""
`;
    const { bytecode, constants } = parseAndCompile(code);

    assertEquals(bytecode.length, 14);

    // Check the bind instruction
    const bindInstruction = bytecode[13];
    assertEquals(bindInstruction[0], Opcodes.BIND_WIDGET);
    assertEquals(bindInstruction[1], 1); // 1 event

    // Find the DEF_BLOCK for the click handler
    const defBlockInstruction = bytecode[10];
    assertEquals(defBlockInstruction[0], Opcodes.DEF_BLOCK);

    // Inspect the block itself
    const block = constants[defBlockInstruction[1]];
    assertEquals(block.bytecode.length, 7); // lappend (4) + set (3)
    assertEquals(block.bytecode[0][0], Opcodes.PUSH_CONST); // arg 1: todos
    assertEquals(block.bytecode[1][0], Opcodes.PUSH_VAR);   // arg 2: {$new_todo_text}
    assertEquals(block.bytecode[3][0], Opcodes.CALL_PROC);  // lappend is at index 3
});

Deno.test("Compiler Integration: API Fetcher App", () => {
    const code = `
set posts []
bind fetch_button
  .click
    http.get "https://..."
      .callback
        set posts {$http_response}
`;
    const { bytecode, constants } = parseAndCompile(code);

    assertEquals(bytecode.length, 7); // set (3) + bind (4)

    // Find the http.get block from the bind instruction
    const bindBlockIndex = bytecode[3][1]; // bytecode[3] is the DEF_BLOCK for .click
    const bindBlock = constants[bindBlockIndex];
    
    // The http.get command is the only one in the .click block.
    // It consists of DEF_BLOCK, PUSH_CONST, PUSH_CONST, HTTP_GET
    assertEquals(bindBlock.bytecode.length, 4);
    const httpGetInstruction = bindBlock.bytecode[3];
    assertEquals(httpGetInstruction[0], Opcodes.HTTP_GET);
    assertEquals(httpGetInstruction[1], 1); // 1 callback

    // Find the callback block defined within the http.get block
    const callbackBlockIndex = bindBlock.bytecode[0][1]; // bindBlock.bytecode[0] is the DEF_BLOCK for .callback
    const callbackBlock = bindBlock.constants[callbackBlockIndex];

    // Check the set instruction inside the callback
    assertEquals(callbackBlock.bytecode.length, 3);
    const setInCallback = callbackBlock.bytecode[2]; // set is the last instruction
    assertEquals(setInCallback[0], Opcodes.SET_STATE);
});
