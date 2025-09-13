# Design V1: TCL-like Web UI Builder

## 1. Core Philosophy

(Unchanged from V1) The goal is to create a minimal language for defining web user interfaces with a syntax that is simple, Tcl/Tk-inspired, easy to parse, mobile-friendly, and web-native.

## 2. Syntax Principles

(Unchanged from V1)

1.  **Line-Based:** Every command is on a new line.
2.  **Command-Argument Structure:** The first word on a line is the command.
3.  **Whitespace Separation:** Commands and arguments are separated by spaces.
4.  **String Handling:** Arguments with spaces must be enclosed in double quotes (`"`).
5.  **Comments:** Lines beginning with `#` are comments.
6.  **Variable Substitution:** Words prefixed with `$` are treated as variables (e.g., `$counter`).

---

## 3. Core Concepts

### 3.1. Expanded Widget Set

**Syntax:** `widget_type name [property1 value1] ...`

| Command | Description | Key Properties | Example |
| :--- | :--- | :--- | :--- |
| `label` | A static text display. | `text`, `font_size` | `label title text "Welcome"` |
| `button` | A clickable button. | `text` | `button submit text "Submit"` |
| `entry` | A single-line text input. | `placeholder`, `value`| `entry username placeholder "Name"` |
| `frame` | A container to group widgets. | `border`, `background`| `frame form_area border "1px solid"` |
| `checkbox`| A checkbox for boolean input. | `text`, `checked` | `checkbox terms text "I agree" checked false` |
| `slider` | A range slider. | `min`, `max`, `value` | `slider volume min 0 max 100 value 50` |
| `image` | Displays an image. | `src`, `alt` | `image logo src "/logo.png" alt "Logo"` |
| `link` | A hyperlink. | `text`, `href` | `link docs text "Read Docs" href "/docs"` |

### 3.2. Layout

(Unchanged from V1) `layout_stack` and `layout_row` are used to arrange widgets vertically or horizontally.

### 3.3. State Management: Variables

Variables store data that can be used by other commands. They are essential for creating dynamic applications.

**Syntax:**
*   `var variable_name initial_value`
*   `var variable_name expr $var1 + $var2` (for expressions)

To use a variable, prefix its name with a `$`.

### 3.4. Logic and Expressions

#### Expressions
Simple expressions can be evaluated using the `expr` keyword in commands like `var` and `set_prop`. For V2, this supports basic arithmetic (`+`, `-`) and string concatenation (`+`).

**Syntax:** `command ... expr value1 + value2`

#### Conditional Logic
The `if` command allows for simple conditional execution. It checks a condition and, if true, runs an action command.

**Syntax:** `if <widget> <property> <operator> <value> then <action_command> [action_args...]`

*   **Supported Operators:** `==` (equals), `!=` (not equals), `>` (greater than), `<` (less than)

### 3.5. Styling

While widgets have basic properties, the `style` command allows for applying any CSS property to a widget for more detailed customization.

**Syntax:** `style widget_name css_property css_value`

### 3.6. Event Handling

(Unchanged from V1) The `on` command binds widget events to actions.

**Action Commands:** `set_prop`, `alert`, `var` (for updating variables), `if`.

---

## 4. Mini-App Examples

(Examples 1-3 remain the same)

### Example 1: Counter App

*Demonstrates: `var`, `label`, `button`, `expr`*

```tcl
# State: Create a variable to hold the count
var count 0

# UI: Create a label to show the count and two buttons
label count_display text "Count: $count"
button increment_btn text "+"
button decrement_btn text "-"

# Layout: Arrange the buttons in a row, then stack the label above them
frame button_bar
layout_row increment_btn decrement_btn
layout_stack count_display button_bar

# Logic: Bind clicks to update the variable and the label
on click increment_btn var count expr $count + 1
on click increment_btn set_prop count_display text "Count: $count"

on click decrement_btn var count expr $count - 1
on click decrement_btn set_prop count_display text "Count: $count"
```

### Example 2: Simple Form Validation

*Demonstrates: `if`, `entry`, `style`*

```tcl
# UI: An input for a password and a button to check it
entry password_input placeholder "Enter password (min 5 chars)"
button check_btn text "Check Validity"
label status_label text "Awaiting input..."

# Layout
layout_stack password_input check_btn status_label

# Style the status label to be noticeable
style status_label color "grey"

# Logic: On button click, check the length of the input value
on click check_btn if password_input value.length < 5 then set_prop status_label text "Password is too short!"
on click check_btn if password_input value.length < 5 then style status_label color "red"

on click check_btn if password_input value.length >= 5 then set_prop status_label text "Password is strong!"
on click check_btn if password_input value.length >= 5 then style status_label color "green"
```

### Example 3: Image Slider

*Demonstrates: `image`, `slider`, `set_prop`*

```tcl
# This example assumes we have images named image_1.png, image_2.png, etc.

# State: Keep track of the current image number
var image_num 1

# UI: An image display and a slider to control it
image main_image src "/image_$image_num.png" alt "Display image"
slider image_selector min 1 max 5 value 1

# Layout
layout_stack main_image image_selector

# Style the image to have a fixed size
style main_image width "400px"
style main_image height "300px"
style main_image border "2px solid black"

# Logic: When the slider value changes, update the image source
# The 'on change' event is assumed for sliders
on change image_selector var image_num $self.value
on change image_selector set_prop main_image src "/image_$image_num.png"
```

---

## 5. Advanced Frame Usage Examples

The `frame` command is essential for creating structured and complex layouts. It acts as a container that can have its own layout manager (`layout_stack` or `layout_row`) and styling, allowing you to group and nest widgets.

### Example 4: Login Form with Visual Grouping

*Demonstrates: Using a frame to create a visually distinct container for a form.*

```tcl
# Create a frame to act as the login box container
frame login_box

# Style the frame to look like a box
style login_box border "1px solid #ccc"
style login_box background "#f9f9f9"
style login_box padding "20px"
style login_box border-radius "8px"

# Create the widgets that will go inside the frame
label login_title text "Member Login"
entry username_input placeholder "Username"
entry password_input placeholder "Password"
button login_button text "Log In"

# Use a layout command to arrange the widgets *inside* the login_box frame
# Note: The target of the layout command is the frame itself.
layout_stack login_box login_title username_input password_input login_button

# The login_box frame itself is the only top-level widget in this case
# and would be placed directly in the body.
```

**Explanation:** The `login_box` frame is used to group all the login elements. By applying `style` commands to `login_box`, we create a visual container that separates the form from the rest of the page content. The `layout_stack` command then organizes the content *within* that frame.

### Example 5: User Profile Card with Nested Layouts

*Demonstrates: Nesting frames with different layouts (a row inside a stack) to build a complex component.*

```tcl
# 1. Create the main container for the entire card
frame profile_card
style profile_card border "1px solid #ddd" width "300px"

# 2. Create the top part of the card, which will be a horizontal row
frame top_row

# 3. Create the widgets for the top row
image avatar src "/avatar.png" alt "User Avatar"
style avatar width "50px" height "50px" border-radius "50%"

# 3a. Create a sub-frame for the user text (name and email)
frame user_details
label user_name text "John Doe"
style user_name font-weight "bold"
label user_email text "john.doe@example.com"

# 3b. Layout the user text vertically inside its own frame
layout_stack user_details user_name user_email

# 3c. Layout the avatar and user text horizontally in the top_row frame
layout_row top_row avatar user_details

# 4. Create the widgets for the bottom part of the card
label bio text "Building cool things with the TCL Web UI Builder."
style bio padding "10px"
button follow_btn text "Follow"

# 5. Put all the major pieces together in the main profile_card frame
# The layout is: a horizontal row, a label, and a button, all stacked vertically.
layout_stack profile_card top_row bio follow_btn
```

**Explanation:** This example shows the power of nesting. 
1. `profile_card` is the outermost container, using `layout_stack`.
2. Its first item is `top_row`, another frame that uses `layout_row` to place an image and text side-by-side.
3. To stack the user's name and email next to the image, we introduce *another* frame (`user_details`) which uses `layout_stack`.
This hierarchical nesting of frames with different layout managers allows for the creation of almost any 2D layout.

---

## 6. Compiler / Transpiler Strategy

(Largely unchanged, but with additions)

1.  **Parse & Tokenize:** As before.
2.  **Symbol Table:** Maintain a table of widgets and variables.
3.  **Build DOM & CSS:**
    *   Widget commands create HTML elements.
    *   `style` commands generate CSS rules associated with the widget's ID.
4.  **Generate JavaScript:**
    *   `var` commands create JavaScript variables.
    *   `on` commands create event listeners.
    *   Action commands (`set_prop`, `if`, `var` updates) are translated into the body of the event listener function.
    *   The compiler must resolve variables (`$count`) and property access (`password_input.value.length`) into valid JavaScript references within the generated functions.
