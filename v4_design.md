# TCL-Web: A Simple Web App Builder - Design v4

## 1. Introduction

This document merges and refines previous designs into a cohesive whole. The most significant change in v4 is the move from curly-brace `{}` blocks to a Python-style indentation-based syntax for defining code blocks. This makes the language even cleaner and easier to type.

TCL-Web is a lightweight, declarative syntax for building simple web applications, designed for simplicity, readability, and ease of use.

## 2. Core Concepts & Runtime

TCL-Web code is compiled into an intermediate JavaScript representation that operates on a small, efficient runtime. This runtime manages the application state, widget creation, event handling, and DOM manipulation.

### The Runtime Environment (Conceptual)

The compiler will generate JavaScript code that interacts with a `TCLWebRuntime` object. This object is responsible for:
-   **State Management**: A central `state` object holds all application data.
-   **Widget Registry**: A `widgets` object holds references to all created DOM elements.
-   **DOM Manipulation**: Functions to create, update, and delete elements.

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

### New Indentation-Based Syntax

Any command that requires a block of code is defined by one or more subsequent lines indented by 2 spaces.
".<event>" inside a block is used to define a event block where commands inside it will run when that event is triggered.

**Old Syntax:** `bind my_button click { alert "Clicked!" }`

**New Syntax:**
```tcl
bind my_button 
  .click
    alert "Clicked!"
```

---

## 3. Command Reference & JavaScript Translation

### 3.1. Widget Creation

#### `label <name> <text>` (Shortcut: `l`)
-   **Description**: Creates a non-interactive text element.
-   **JS Translation**:
    ```javascript
    // TCL: l my_label "Hello World"
    TCLWebRuntime.createWidget('my_label', 'LABEL', { initialText: "Hello World" });
    ```

#### `button <name> <text>` (Shortcut: `b`)
-   **Description**: Creates a clickable button. The `-command` script is executed on click.
-   **JS Translation**:
    ```javascript
    // TCL:
    // b my_button "Click Me"
    TCLWebRuntime.createWidget('my_button', 'BUTTON', { label: "Click Me" });
    ```

#### `input <name> -bind <variable>` (Shortcut: `i`)
-   **Description**: Creates an input field with two-way data binding.
-   **JS Translation**:
    ```javascript
    // TCL: i name_input -bind user_name
    TCLWebRuntime.createWidget('name_input', 'INPUT', {});
    ```

#### `listbox <name>`
-   **Description**: Creates a list container.
-   **JS Translation**:
    ```javascript
    // TCL: listbox my_list
    TCLWebRuntime.createWidget('my_list', 'LISTBOX', {});
    ```

#### `canvas <name> <width> <height>`
-   **Description**: Creates a drawing canvas.
-   **JS Translation**:
    ```javascript
    // TCL: canvas my_canvas 400 300
    TCLWebRuntime.createWidget('my_canvas', 'CANVAS', { width: 400, height: 300 });
    ```

### 3.2. Configuration

#### `config <widget> -property <value>` (Shortcut: `conf`)
-   **Description**: Modifies a widget's properties.
-   **Common Properties**:
    - `-text <string>`: Text content for labels and buttons
    - `-bg <color>`: Background color
    - `-fg <color>`: Foreground/text color
    - `-font <font>`: Font family and size
    - `-width <pixels>`: Widget width
    - `-height <pixels>`: Widget height
    - `-items <list>`: List items for listbox widgets
    - `-value <string>`: Current value for input widgets
    - `-state <state>`: Widget state (`normal`, `disabled`, `readonly`)
    - `-visible <boolean>`: Whether the widget is visible (`true`, `false`, `toggle`)
-   **JS Translation**:
    ```javascript
    // TCL: conf my_label -text "New Text" -bg "blue" -fg "white" -visible true
    TCLWebRuntime.updateWidget('my_label', { 
      text: "New Text",
      backgroundColor: "blue",
      color: "white",
      visible: true
    });
    ```

### 3.3. Layout

#### `pack <widget> [options]`
-   **Description**: Positions widgets within their parent container using flexbox layout.
-   **Options**:
    - **Positioning**:
        - `-side <direction>`: Where to pack the widget (`top`, `bottom`, `left`, `right`)
        - `-anchor <position>`: How to anchor the widget (`n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`, `center`)
    - **Sizing**:
        - `-fill <axis>`: How the widget should expand (`x`, `y`, `both`, `none`)
        - `-expand <boolean>`: Whether the widget should expand to fill available space (`yes`, `no`)
    - **Padding**:
        - `-padx <pixels>`: Horizontal padding around the widget
        - `-pady <pixels>`: Vertical padding around the widget
        - `-ipadx <pixels>`: Internal horizontal padding within the widget
        - `-ipady <pixels>`: Internal vertical padding within the widget
-   **JS Translation**:
    ```javascript
    // TCL: pack my_label -side top -fill both -expand yes -padx 10 -pady 5
    const parent = TCLWebRuntime.widgets.main;
    const child = TCLWebRuntime.widgets.my_label;
    
    // Apply flexbox properties
    child.style.flex = '1 1 auto';  // expand yes + fill both
    child.style.margin = '5px 10px'; // pady padx
    child.style.alignSelf = 'stretch'; // fill both
    
    parent.appendChild(child);
    parent.style.display = 'flex';
    parent.style.flexDirection = 'column'; // side top
    ```

### 3.4. State Management

#### `set <variable> <value>`
-   **Description**: Sets a variable in the application state.
-   **JS Translation**:
    ```javascript
    // TCL: set user_name "Alice"
    TCLWebRuntime.setState('user_name', "Alice");
    ```

#### `watch <variable>:`
-   **Description**: Executes a script whenever a state variable changes.
-   **JS Translation**:
    ```javascript
    // TCL:
    // watch user_name
    //   conf greeting -text "Hello, {get user_name}"
    TCLWebRuntime.watchState('user_name', (newValue) => {
      TCLWebRuntime.executeTCLScript('conf greeting -text "Hello, {get user_name}"');
    });
    ```

### 3.5. Bindings

#### `bind <widget>:`
-   **Description**: Binds event handlers to widgets using indented blocks for different event types.
-   **JS Translation**:
    ```javascript
    // TCL:
    // bind my_button
    //   .click
    //     alert "Button clicked!"
    //   .mouseover
    //     conf my_button -bg "lightblue"
    TCLWebRuntime.bindWidget('my_button', {
      click: () => {
        TCLWebRuntime.executeTCLScript('alert "Button clicked!"');
      },
      mouseover: () => {
        TCLWebRuntime.executeTCLScript('conf my_button -bg "lightblue"');
      }
    });
    ```


### 3.6. Procedures and Control Flow

#### `proc <name> <args>:`
-   **Description**: Defines a reusable procedure.
-   **JS Translation**:
    ```javascript
    // TCL:
    // proc greet name
    //   alert "Hello, {name}"
    TCLWebRuntime.procs['greet'] = (args) => {
      const scriptBody = `alert "Hello, ${args[0]}"`;
      TCLWebRuntime.executeTCLScript(scriptBody);
    };
    ```

### 3.6. HTTP Calls

#### `http.get <url>`
-   **Description**: Makes an HTTP GET request.
-   **JS Translation**:
    ```javascript
    // TCL:
    // http.get "/api/user"
    //  .callback
    //    set user_data $http_response
    //  .error
    //    set status $error
    fetch('/api/user')
      .then(response => response.json())
      .then(data => {
        TCLWebRuntime.setHttpVar(data);
        TCLWebRuntime.executeTCLScript('set user_data $http_response');
      });
    ```

---

## 4. Tutorials

### Tutorial 1: Todo App

```tcl
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
```

### Tutorial 2: Simple Drawing App

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
bind pad
  .mousedrag
   draw pad circle {$event.x} {$event.y} 2 -fill {$draw_color}

# 5. Control Logic
bind clear_button
  .click
    draw pad clear
```

### Tutorial 3: API Data Fetcher

```tcl
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
```
