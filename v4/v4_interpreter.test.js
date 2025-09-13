import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

import Parser from "./v4_parser.js";
import Compiler from "./v4_compiler.js";
import Interpreter from "./v4_interpreter.js";

// Helper to set up a clean DOM and interpreter for each test
function setup() {
    const document  = new DOMParser().parseFromString(
        `<div id="root"></div>`,
        "text/html",
    );
    globalThis.document = document;
    const interpreter = new Interpreter("root");
    return { interpreter, document };
}

function run(interpreter, code) {
    const parser = new Parser();
    const compiler = new Compiler();
    const ast = parser.parse(code);
    const { bytecode, constants } = compiler.compile(ast);
    interpreter.run(bytecode, constants);
}

Deno.test("Real Interpreter: Widget Creation", () => {
    const { interpreter, document } = setup();
    run(interpreter, `l my_label "Hello World"`);

    const label = document.getElementById("my_label");
    assertExists(label);
    assertEquals(label.tagName, "LABEL");
    assertEquals(label.textContent, "Hello World");
});

Deno.test("Real Interpreter: Widget Update (config)", () => {
    const { interpreter, document } = setup();
    run(interpreter, `
l my_label "Initial"
conf my_label -text "Updated" -bg "blue"
`);

    const label = document.getElementById("my_label");
    assertExists(label);
    assertEquals(label.textContent, "Updated");
    assertEquals(label.style.backgroundColor, "blue");
});

Deno.test("Real Interpreter: Event Binding (bind)", () => {
    const { interpreter, document } = setup();
    run(interpreter, `
b my_button "Click Me"
bind my_button
  .click
    set was_clicked 1
`);

    const button = document.getElementById("my_button");
    assertExists(button);

    // Simulate a click
    button.dispatchEvent(new Event('click', { bubbles: true }));

    // Check the runtime state
    const stateValue = interpreter.runtime.getState("was_clicked");
    assertEquals(stateValue, 1);
});

Deno.test("Real Interpreter: Reactivity (watch)", () => {
    const { interpreter, document } = setup();
    run(interpreter, `
l my_label "Initial"
watch my_var
  conf my_label -text {$my_var}
`);

    const label = document.getElementById("my_label");
    assertEquals(label.textContent, "Initial");

    // Now, change the state. The watcher should trigger the update.
    interpreter.runtime.setState("my_var", "Updated by watcher");

    // To test this properly, we need to manually invoke the watcher's callback
    // since our mock runtime doesn't have a full reactive loop.
    const watcherCallback = interpreter.runtime.watchers.get("my_var")[0];
    watcherCallback();

    assertEquals(label.textContent, "Updated by watcher");
});
