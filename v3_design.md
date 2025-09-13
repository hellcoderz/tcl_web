# TCL-Web: A Simple Web App Builder - Design v3

## 1. Introduction

This document expands on `design_v2.md`, providing a more detailed look into the TCL-Web language, its translation to JavaScript, and its practical application through tutorials. TCL-Web is a lightweight, declarative syntax for building simple web applications, designed for simplicity and ease of use, especially on mobile devices.

## 2. Core Concepts & Runtime

TCL-Web code is compiled into an intermediate JavaScript representation that operates on a small, efficient runtime. This runtime manages the application state, widget creation, event handling, and DOM manipulation.

### The Runtime Environment (Conceptual)

The compiler will generate JavaScript code that interacts with a `TCLWebRuntime` object. This object is responsible for:
-   **State Management**: A central `state` object holds all application data. Changes to this state can trigger UI updates.
-   **Widget Registry**: A `widgets` object holds references to all created DOM elements, keyed by their TCL-Web name.
-   **DOM Manipulation**: Functions to create, update, and delete elements.
-   **Event Bus**: Manages event listeners and dispatches events.

```javascript
// Conceptual representation of the runtime
const TCLWebRuntime = {
  state: {},       // For variables set by `set`
  widgets: {},     // For elements created by `label`, `button`, etc.
  components: {},  // For defined components
  procs: {},       // For custom procedures
  // ... methods for creating widgets, binding events, etc.
};
```

---

## 3. Command Reference & JavaScript Translation

This section details each command and its corresponding JavaScript translation.

### 3.1. Widget Creation

#### `label <name> <text>` (Shortcut: `l`)
-   **Description**: Creates a non-interactive text element.
-   **JS Translation**:
    ```javascript
    // TCL: l my_label "Hello World"
    TCLWebRuntime.createWidget('my_label', 'LABEL', { initialText: "Hello World" });
    ```
    The `createWidget` function would generate a `<span>` or `<div>`, store it in `TCLWebRuntime.widgets.my_label`, and append it to the current parent container.

#### `button <name> <text> -command {<script>}` (Shortcut: `b`)
-   **Description**: Creates a clickable button. The `-command` script is executed on click.
-   **JS Translation**:
    ```javascript
    // TCL: b my_button "Click Me" -command { alert "Clicked!" }
    TCLWebRuntime.createWidget('my_button', 'BUTTON', { label: "Click Me" });
    TCLWebRuntime.bindEvent('my_button', 'click', () => {
      TCLWebRuntime.executeTCLScript('alert "Clicked!"');
    });
    ```

#### `input <name> -bind <variable>` (Shortcut: `i`)
-   **Description**: Creates an input field. The `-bind` option creates a two-way data binding with a state variable.
-   **JS Translation**:
    ```javascript
    // TCL: i name_input -bind user_name
    TCLWebRuntime.createWidget('name_input', 'INPUT', {});
    TCLWebRuntime.bindState('name_input', 'user_name');
    ```
    The `bindState` function sets up listeners to update `TCLWebRuntime.state.user_name` when the input value changes, and to update the input's value when the state variable changes.

#### `listbox <name>` (New in v3)
-   **Description**: Creates a list container. Items can be added via `conf <name> -items <list>`.
-   **JS Translation**:
    ```javascript
    // TCL: listbox my_list
    TCLWebRuntime.createWidget('my_list', 'LISTBOX', {});
    ```

#### `canvas <name> <width> <height>` (New in v3)
-   **Description**: Creates a drawing canvas.
-   **JS Translation**:
    ```javascript
    // TCL: canvas my_canvas 400 300
    TCLWebRuntime.createWidget('my_canvas', 'CANVAS', { width: 400, height: 300 });
    ```

### 3.2. Configuration

#### `config <widget> -property <value>` (Shortcut: `conf`)
-   **Description**: Modifies a widget's properties.
-   **JS Translation**:
    ```javascript
    // TCL: conf my_label -text "New Text"
    TCLWebRuntime.updateWidget('my_label', { text: "New Text" });

    // TCL: conf my_list -items {"item1", "item2"}
    TCLWebRuntime.updateWidget('my_list', { items: ["item1", "item2"] });
    ```
    The `updateWidget` function finds the element and applies the changes (e.g., `element.textContent = "New Text"`).

### 3.3. Layout

#### `pack <widget> ...`
-   **Description**: Simple flexbox-based packing.
-   **JS Translation**: This is primarily handled by CSS, but the JS needs to ensure elements are in the correct parent. The translation would involve appending the child element to the parent's DOM node.
    ```javascript
    // TCL: c main; l my_label "Hi"; pack my_label
    const parent = TCLWebRuntime.widgets.main;
    const child = TCLWebRuntime.widgets.my_label;
    parent.appendChild(child);
    // CSS classes for packing would be applied.
    ```

#### `grid <widget> -row <r> -col <c> ...` (New in v3)
-   **Description**: A more structured grid-based layout.
-   **JS Translation**: Similar to `pack`, this involves DOM hierarchy and applying CSS classes or styles.
    ```javascript
    // TCL: grid my_label -row 1 -col 2
    const child = TCLWebRuntime.widgets.my_label;
    child.style.gridRow = 1;
    child.style.gridColumn = 2;
    ```

### 3.4. State Management

#### `set <variable> <value>`
-   **Description**: Sets a variable in the application state.
-   **JS Translation**:
    ```javascript
    // TCL: set user_name "Alice"
    TCLWebRuntime.setState('user_name', "Alice");
    ```
    The `setState` function would update `TCLWebRuntime.state.user_name` and trigger any watchers.

#### `get <variable>`
-   **Description**: Retrieves a variable's value.
-   **JS Translation**:
    ```javascript
    // TCL: get user_name
    TCLWebRuntime.getState('user_name');
    ```

#### `watch <variable> {<script>}` (New in v3)
-   **Description**: Executes a script whenever a state variable changes.
-   **JS Translation**:
    ```javascript
    // TCL: watch user_name { conf greeting -text "Hello, {get user_name}" }
    TCLWebRuntime.watchState('user_name', (newValue) => {
      TCLWebRuntime.executeTCLScript('conf greeting -text "Hello, {get user_name}"');
    });
    ```

### 3.5. Procedures and Control Flow

#### `proc <name> {<args>} {<body>}`
-   **Description**: Defines a reusable procedure.
-   **JS Translation**:
    ```javascript
    // TCL: proc greet {name} { alert "Hello, {name}" }
    TCLWebRuntime.procs['greet'] = (args) => {
      // The runtime would substitute the args into the script body
      const scriptBody = `alert "Hello, ${args[0]}"`;
      TCLWebRuntime.executeTCLScript(scriptBody);
    };
    ```

### 3.6. HTTP Calls

#### `http.get <url> -callback {<script>}`
-   **Description**: Makes an HTTP GET request.
-   **JS Translation**:
    ```javascript
    // TCL: http.get "/api/user" -callback { set user_data $http_response }
    fetch('/api/user')
      .then(response => response.json())
      .then(data => {
        TCLWebRuntime.setHttpVar(data); // Puts data in special $http_response var
        TCLWebRuntime.executeTCLScript('set user_data $http_response');
      });
    ```

---

## 4. Tutorials

### Tutorial 1: Todo App

This app demonstrates state management, list manipulation, and bindings.

```tcl
# --- Todo App ---

# 1. State Initialization
# We store todos in a list. The `new_todo_text` is bound to the input field.
set todos {"Learn TCL-Web", "Build an app"}
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
# Configure the listbox with the initial list of todos.
conf todo_list -items {$todos}

# 5. Actions and Bindings
# When the "Add" button is clicked, add the new todo to the list
# and clear the input field.
bind add_button click {
  # Add the new todo to our list variable
  lappend todos {$new_todo_text}
  # Clear the input field
  set new_todo_text ""
}

# 6. Reactivity
# Watch the `todos` variable. When it changes, update the listbox.
watch todos {
  conf todo_list -items {$todos}
}
```

### Tutorial 2: Simple Drawing App

This app shows how to use the `canvas` and `draw` commands.

```tcl
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
# When the user drags their mouse on the canvas, draw a small circle.
# The `event` variable holds event-specific data like mouse coordinates.
bind pad mousedrag {
  draw pad circle {$event.x} {$event.y} 2 -fill {$draw_color}
}

# 5. Control Logic
# Clear the canvas when the button is clicked.
bind clear_button click {
  draw pad clear
}
```

### Tutorial 3: API Data Fetcher

This app fetches data from a public API and displays it in a list.

```tcl
# --- API Fetcher ---

# 1. State
set posts {}

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
# When the button is clicked, fetch data from the JSONPlaceholder API.
bind fetch_button click {
  http.get "https://jsonplaceholder.typicode.com/posts" -callback {
    # The response is a JSON string. We need to process it.
    # Let's assume a `json` command to extract data.
    set posts [json extract "title" from {$http_response}]
  }
}

# 5. Reactivity
# When the `posts` variable is updated, refresh the listbox.
watch posts {
  conf post_list -items {$posts}
}
```
