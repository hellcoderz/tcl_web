import {
  assertEquals,
} from "https://deno.land/std@0.224.0/testing/asserts.ts";
import Parser from "./v4_parser.js";

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
