
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
