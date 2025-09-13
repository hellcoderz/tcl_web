# TCL-Web: A Simple Web App Builder - Design v2

## 1. Introduction

TCL-Web is a lightweight, declarative syntax for building simple web applications. It's inspired by the simplicity of TCL/Tk but is designed for the modern web. The syntax is minimal and easy to type on any device, including mobile phones. It aims to provide a fast way to create interactive web UIs without the complexity of modern frontend frameworks.

## 2. Core Principles

*   **Simplicity:** The syntax is designed to be extremely easy to learn and parse. Commands are simple and consistent.
*   **Mobile-First:** The language is designed to be easy to write on a mobile device.
*   **Web-Native:** It compiles to standard HTML, CSS, and JavaScript. No heavy runtime is required.
*   **Component-Based:** Encourages the creation of reusable components.

## 3. Syntax

The syntax is command-based, where each line is a command followed by its arguments.

```tcl
command arg1 arg2 ...
```

-   Commands are separated by newlines.
-   Arguments are separated by spaces.
-   Strings with spaces can be quoted with `{}` or `""`.
-   Comments start with `#`.
-   Shortcuts are available for common commands.

## 4. Commands

### 4.1. Widget Creation

Widgets are the basic building blocks of the UI.

**Commands:**
*   `label <name> <text>`: Creates a text label. Shortcut: `l`
*   `button <name> <text> -command <script>`: Creates a button. Shortcut: `b`
*   `input <name> -type <text|password|email> -bind <variable>`: Creates an input field. Shortcut: `i`
*   `container <name>`: Creates a container for other widgets. Shortcut: `c`

**Example:**
```tcl
# Create a label and a button inside a container
c main
  l welcome_label {Hello, World!}
  b greet_button {Click Me} -command {
    # Action script here
  }
```

### 4.2. Layout Commands

Layout commands control how widgets are placed on the screen. We'll start with a simple `pack`-like geometry manager.

**Commands:**
*   `pack <widget1> <widget2> ... -side <top|bottom|left|right> -fill <x|y|both> -expand <yes|no>`: Packs widgets into a container. Shortcut: `p`

**Example:**
```tcl
c main
  l title "My App"
  i name -bind user_name
  b submit "Submit"

p title -side top
p name -side top -fill x
p submit -side bottom
```

### 4.3. Configuration

The `config` command modifies widget properties.

**Commands:**
*   `config <widget> -property <value>`: Changes a widget's property. Shortcut: `conf`

**Example:**
```tcl
l my_label "Initial Text"
# Later in the code...
conf my_label -text "Updated Text"
```

### 4.4. Components

Components allow for the creation of reusable UI elements.

**Commands:**
*   `component <name> {<script>}`: Defines a new component.
*   `use <component_name> <instance_name>`: Creates an instance of a component.

**Example:**
```tcl
# Define a component for a user input field
component user_input {
  c container
    l label "Enter your name:"
    i entry
  pack label entry -side left
}

# Use the component
use user_input my_input_field
```

### 4.5. Actions & Bindings

Actions are scripts that run in response to events. Bindings connect events to actions.

**Commands:**
*   `bind <widget> <event> {<script>}`: Binds a script to a widget's event.
*   `set <variable> <value>`: Sets a variable's value.
*   `get <variable>`: Gets a variable's value.
*   `alert <message>`: Shows an alert box.

**Events:**
*   `click`: When a widget is clicked.
*   `enter`: When the user presses Enter in an input field.
*   `update`: When an input's value changes.

**Example:**
```tcl
i name_input -bind user_name
l greeting "Hello, "

bind name_input update {
  conf greeting -text "Hello, {get user_name}"
}

b my_button "Greet" -command {
  alert "Hello, {get user_name}!"
}
```

### 4.6. Procedures

Procedures (procs) are custom commands.

**Commands:**
*   `proc <name> {<args>} {<body>}`: Defines a procedure.

**Example:**
```tcl
proc update_greeting {name} {
  conf greeting -text "Hello, {name}"
}

b my_button "Greet" -command {
  update_greeting {get user_name}
}
```

### 4.7. External HTTP Calls

The `http` command allows for making requests to external APIs.

**Commands:**
*   `http.get <url> -callback <script>`: Performs an HTTP GET request.
*   `http.post <url> <body> -callback <script>`: Performs an HTTP POST request.

The callback script can access the response data via a special variable `http_response`.

**Example:**
```tcl
b fetch_button "Fetch Data" -command {
  http.get "https://api.example.com/data" -callback {
    # Assume response is JSON: {"message": "Hello from API"}
    # A simple way to parse JSON could be provided, e.g., json.get
    set api_message [json.get message from $http_response]
    conf result_label -text $api_message
  }
}

l result_label ""
```

## 5. Full Example: A Simple "Greeter" App

This example combines the features to create a small application.

```tcl
# App State
set user_name "World"

# UI Definition
c root
  c top_bar
    l title "Greeter App"
  c main_content
    l name_label "Enter your name:"
    i name_input -bind user_name
    b greet_button "Greet Me"
  c footer
    l status "Ready"

# Layout
pack top_bar -side top -fill x
pack main_content -side top -pady 10
pack footer -side bottom -fill x

# Style (Simplified CSS-like properties)
conf title -font.size 24 -font.weight bold
conf name_label -fg #333
conf greet_button -bg #007bff -fg white

# Bindings & Actions
bind name_input update {
  set user_name [get name_input -value]
  conf status "Typing..."
}

bind greet_button click {
  alert "Hello, {$user_name}!"
  conf status "Greeted {$user_name}."
}

# Initial state setup
conf name_input -text {$user_name}
```

This design provides a solid foundation for a simple, yet powerful web app builder. The next steps would be to define the compiler that translates this syntax into HTML, CSS, and JavaScript.
