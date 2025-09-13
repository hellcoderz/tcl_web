export default class Parser {
    /**
     * Parses TCL-Web source code into an Abstract Syntax Tree (AST).
     * @param {string} sourceCode The source code to parse.
     * @returns {object} The root node of the AST (a 'Program' node).
     */
    parse(sourceCode) {
        const lines = this._analyzeLines(sourceCode);
        const ast = this._buildTree(lines);
        return ast;
    }

    /**
     * Phase 1: Analyzes the source code line by line.
     * @param {string} sourceCode
     * @returns {Array<{indent: number, tokens: string[]}>}
     * @private
     */
    _analyzeLines(sourceCode) {
        const processedLines = [];
        if (!sourceCode) return processedLines;
        const rawLines = sourceCode.split(/\r?\n/);

        for (const line of rawLines) {
            // Ignore comments and empty lines
            const trimmedLine = line.trim();
            if (trimmedLine === '' || trimmedLine.startsWith('#')) {
                continue;
            }

            // Calculate indentation
            const match = line.match(/^\s*/);
            const indentation = match ? match[0].length : 0;
            if (indentation % 2 !== 0) {
                throw new Error(`Invalid indentation: must be a multiple of 2 spaces. Found ${indentation} on line: "${line}"`);
            }
            const indentLevel = indentation / 2;

            // Tokenize
            const tokens = this._tokenize(trimmedLine);
            processedLines.push({ indent: indentLevel, tokens });
        }

        return processedLines;
    }

    /**
     * Tokenizes a single line, respecting quoted strings.
     * @param {string} line
     * @returns {string[]}
     * @private
     */
    _tokenize(line) {
        // Regex: match a double-quoted string, or a sequence of non-whitespace chars.
        const tokenRegex = /"[^"]*"|\S+/g;
        return line.match(tokenRegex) || [];
    }

    /**
     * Phase 2: Builds the hierarchical AST from a flat list of processed lines.
     * @param {Array<{indent: number, tokens: string[]}>} lines
     * @returns {object} The root 'Program' node.
     * @private
     */
    _buildTree(lines) {
        const program = { type: 'Program', body: [] };
        const stack = [program.body]; // Stack of 'body' arrays
        let currentIndent = 0;

        for (const line of lines) {
            const commandNode = this._createCommandNode(line.tokens);

            if (line.indent > currentIndent) {
                if (line.indent !== currentIndent + 1) {
                    throw new Error(`Invalid indentation increase. From ${currentIndent} to ${line.indent}`);
                }
                // Get the last command added and start a body for it
                const parentBody = stack[stack.length - 1];
                if (parentBody.length === 0) {
                    throw new Error(`Indentation error: cannot indent on an empty block.`);
                }
                const parentCommand = parentBody[parentBody.length - 1];
                parentCommand.body = [];
                stack.push(parentCommand.body);
            } else if (line.indent < currentIndent) {
                const diff = currentIndent - line.indent;
                for (let i = 0; i < diff; i++) {
                    stack.pop();
                }
            }
            
            // Add the new command to the current body
            stack[stack.length - 1].push(commandNode);
            currentIndent = line.indent;
        }

        return program;
    }

    /**
     * Creates a Command node from a list of tokens.
     * @param {string[]} tokens
     * @returns {object} A 'Command' node.
     * @private
     */
    _createCommandNode(tokens) {
        const [name, ...args] = tokens;
        return {
            type: 'Command',
            name: { type: 'Identifier', value: name },
            args: args.map(this._createArgumentNode),
            body: null,
        };
    }

    /**
     * Creates an Argument node from a single token.
     * @param {string} token
     * @returns {object} An argument node.
     * @private
     */
    _createArgumentNode(token) {
        if (token.startsWith('{$') && token.endsWith('}')) {
            return {
                type: 'VariableSubstitution',
                name: token.slice(2, -1),
            };
        }
        if (token.startsWith('"') && token.endsWith('"')) {
            return {
                type: 'StringLiteral',
                value: token.slice(1, -1),
            };
        }
        if (token.startsWith('-')) {
            return {
                type: 'Option',
                value: token,
            };
        }
        return {
            type: 'Identifier',
            value: token,
        };
    }
}