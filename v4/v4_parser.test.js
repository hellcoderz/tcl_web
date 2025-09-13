
import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/testing/asserts.ts";
import Parser from "./v4_parser.js";

Deno.test("Parser: Simple Command", () => {
  const code = `l my_label "Hello World"`;
  const parser = new Parser();
  const ast = parser.parse(code);

  assertEquals(ast.type, "Program");
  assertEquals(ast.body.length, 1);
  const cmd = ast.body[0];
  assertEquals(cmd.type, "Command");
  assertEquals(cmd.name.value, "l");
  assertEquals(cmd.args.length, 2);
  assertEquals(cmd.args[0], { type: "Identifier", value: "my_label" });
  assertEquals(cmd.args[1], { type: "StringLiteral", value: "Hello World" });
  assertEquals(cmd.body, null);
});

Deno.test("Parser: Ignores Comments and Empty Lines", () => {
    const code = `
# This is a comment
l first "one"

b second "two"
`;
    const parser = new Parser();
    const ast = parser.parse(code);
    assertEquals(ast.body.length, 2);
    assertEquals(ast.body[0].name.value, "l");
    assertEquals(ast.body[1].name.value, "b");
});

Deno.test("Parser: All Argument Types", () => {
    const code = `conf my_widget -text {$my_var} -bg "blue"`;
    const parser = new Parser();
    const ast = parser.parse(code);
    const cmd = ast.body[0];

    assertEquals(cmd.name.value, "conf");
    assertEquals(cmd.args, [
        { type: "Identifier", value: "my_widget" },
        { type: "Option", value: "-text" },
        { type: "VariableSubstitution", name: "my_var" },
        { type: "Option", value: "-bg" },
        { type: "StringLiteral", value: "blue" },
    ]);
});

Deno.test("Parser: Simple Indentation (watch)", () => {
    const code = `
watch user_name
  conf greeting -text "Hello"
`;
    const parser = new Parser();
    const ast = parser.parse(code);

    assertEquals(ast.body.length, 1);
    const watchCmd = ast.body[0];
    assertEquals(watchCmd.name.value, "watch");
    assertEquals(watchCmd.args[0].value, "user_name");
    assertEquals(watchCmd.body.length, 1);

    const confCmd = watchCmd.body[0];
    assertEquals(confCmd.name.value, "conf");
    assertEquals(confCmd.args[0].value, "greeting");
});

Deno.test("Parser: Nested Indentation (bind)", () => {
    const code = `
bind add_button
  .click
    lappend todos {$new_todo_text}
    set new_todo_text ""
`;
    const parser = new Parser();
    const ast = parser.parse(code);

    assertEquals(ast.body.length, 1);
    const bindCmd = ast.body[0];
    assertEquals(bindCmd.name.value, "bind");
    assertEquals(bindCmd.body.length, 1);

    const clickCmd = bindCmd.body[0];
    assertEquals(clickCmd.name.value, ".click");
    assertEquals(clickCmd.body.length, 2);

    const lappendCmd = clickCmd.body[0];
    assertEquals(lappendCmd.name.value, "lappend");

    const setCmd = clickCmd.body[1];
    assertEquals(setCmd.name.value, "set");
});

Deno.test("Parser: Complex Indentation (indent, de-indent, re-indent)", () => {
    const code = `
c root
  l title "Title"
  c controls
    b button1 "Button 1"
    b button2 "Button 2"
  l footer "Footer"
`;
    const parser = new Parser();
    const ast = parser.parse(code);

    const rootCmd = ast.body[0];
    assertEquals(rootCmd.name.value, "c");
    assertEquals(rootCmd.body.length, 3);

    const titleCmd = rootCmd.body[0];
    assertEquals(titleCmd.name.value, "l");
    assertEquals(titleCmd.body, null);

    const controlsCmd = rootCmd.body[1];
    assertEquals(controlsCmd.name.value, "c");
    assertEquals(controlsCmd.body.length, 2);

    const button1Cmd = controlsCmd.body[0];
    assertEquals(button1Cmd.name.value, "b");

    const footerCmd = rootCmd.body[2];
    assertEquals(footerCmd.name.value, "l");
});


Deno.test("Parser: Throws on invalid indentation (odd spaces)", () => {
    const code = `
l label1 "hello"
 l label2 "world"
`;
    const parser = new Parser();
    assertThrows(() => parser.parse(code), Error, "Invalid indentation");
});

Deno.test("Parser: Throws on invalid indentation (jump)", () => {
    const code = `
l label1 "hello"
    l label2 "world"
`;
    const parser = new Parser();
    assertThrows(() => parser.parse(code), Error, "Invalid indentation increase");
});


Deno.test("Parser Integration: Todo App", () => {
    const code = `
# --- Todo App ---

# 1. State Initialization
set todos [list "Learn TCL-Web" "Build an app"]
set new_todo_text ""

# 2. UI Definition
c root
  l title "My Todo List"
  listbox todo_list
  c input_area
    i todo_input -bind new_todo_text
    b add_button "Add Todo"

# 3. Layout
pack title -side top
pack todo_list -side top -fill both -expand yes
pack input_area -side bottom -fill x

# 4. Initial Data Display
conf todo_list -items {$todos}

# 5. Actions and Bindings
bind add_button
  .click
    lappend todos {$new_todo_text}
    set new_todo_text ""

# 6. Reactivity
watch todos
  conf todo_list -items {$todos}
`;
    const parser = new Parser();
    const ast = parser.parse(code);

    assertEquals(ast.type, "Program");
    // Test top-level command count
    assertEquals(ast.body.length, 9);

    // Test a nested structure
    const bindCmd = ast.body[7];
    assertEquals(bindCmd.name.value, "bind");
    assertEquals(bindCmd.args[0].value, "add_button");
    assertEquals(bindCmd.body[0].name.value, ".click");
    assertEquals(bindCmd.body[0].body[0].name.value, "lappend");
    assertEquals(bindCmd.body[0].body[0].args[0].value, "todos");
    assertEquals(bindCmd.body[0].body[0].args[1].name, "new_todo_text");

    // Test a command with many options
    const packCmd = ast.body[4];
    assertEquals(packCmd.name.value, "pack");
    assertEquals(packCmd.args.length, 7);
    assertEquals(packCmd.args[1].value, "-side");
    assertEquals(packCmd.args[2].value, "top");
});

Deno.test("Parser Integration: Drawing App", () => {
    const code = `
# --- Drawing App ---

# 1. UI Definition
c root
  l title "Drawing Pad"
  canvas pad 400 400 -bg white
  c controls
    l color_label "Color:"
    i color_input -bind draw_color
    b clear_button "Clear"

# 2. State
set draw_color "black"

# 3. Layout
pack title -side top
pack pad -side top
pack controls -side bottom

# 4. Drawing Logic
bind pad
  .mousedrag
    draw pad circle {$event.x} {$event.y} 2 -fill {$draw_color}

# 5. Control Logic
bind clear_button
  .click
    draw pad clear
`;
    const parser = new Parser();
    const ast = parser.parse(code);

    assertEquals(ast.body.length, 7);

    const bindPadCmd = ast.body[5];
    assertEquals(bindPadCmd.name.value, "bind");
    assertEquals(bindPadCmd.body[0].name.value, ".mousedrag");
    const drawCmd = bindPadCmd.body[0].body[0];
    assertEquals(drawCmd.name.value, "draw");
    assertEquals(drawCmd.args.length, 7);
    assertEquals(drawCmd.args[6].name, "draw_color");
});

Deno.test("Parser Integration: API Fetcher App", () => {
    const code = `
# --- API Fetcher ---

# 1. State
set posts []

# 2. UI
c root
  l title "Latest Posts"
  b fetch_button "Fetch Posts"
  listbox post_list

# 3. Layout
pack title -side top
pack fetch_button -side top
pack post_list -side top -fill both -expand yes

# 4. Action
bind fetch_button
  .click
    http.get "https://jsonplaceholder.typicode.com/posts"
      .callback
        set posts [json extract "title" from {$http_response}]

# 5. Reactivity
watch posts
  conf post_list -items {$posts}
`;
    const parser = new Parser();
    const ast = parser.parse(code);

    assertEquals(ast.body.length, 7);

    const bindCmd = ast.body[5];
    const httpGetCmd = bindCmd.body[0].body[0];
    assertEquals(httpGetCmd.name.value, "http.get");
    assertEquals(httpGetCmd.args[0].value, "https://jsonplaceholder.typicode.com/posts");
    assertEquals(httpGetCmd.body[0].name.value, ".callback");
    const setCmd = httpGetCmd.body[0].body[0];
    assertEquals(setCmd.name.value, "set");
    assertEquals(setCmd.args[0].value, "posts");
});

