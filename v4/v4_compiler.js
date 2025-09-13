export const Opcodes = {
    PUSH_CONST: 0,
    PUSH_VAR: 1,
    POP: 2,
    SET_STATE: 3,
    BUILD_OBJ: 4,
    CREATE_WIDGET: 5,
    UPDATE_WIDGET: 6,
    PACK_WIDGET: 7,
    DEF_BLOCK: 8,
    BIND_WIDGET: 9,
    WATCH_STATE: 10,
    DEF_PROC: 11,
    CALL_PROC: 12,
    HTTP_GET: 13,
};

export default class Compiler {
    constructor() {
        this.bytecode = [];
        this.constants = [];
    }

    compile(programNode) {
        for (const command of programNode.body) {
            this.compileCommand(command);
        }
        return { bytecode: this.bytecode, constants: this.constants };
    }

    emit(opcode, ...operands) {
        this.bytecode.push([opcode, ...operands]);
    }

    addConstant(value) {
        const index = this.constants.indexOf(value);
        if (index > -1) {
            return index;
        }
        this.constants.push(value);
        return this.constants.length - 1;
    }

    compileArg(argNode) {
        if (argNode.type === 'VariableSubstitution') {
            const constIndex = this.addConstant(argNode.name);
            this.emit(Opcodes.PUSH_VAR, constIndex);
        } else {
            const constIndex = this.addConstant(argNode.value);
            this.emit(Opcodes.PUSH_CONST, constIndex);
        }
    }

    compileBlock(commandNode) {
        const blockCompiler = new Compiler();
        // A block is just a list of commands, so we treat its body as a mini-program
        const programNode = { type: 'Program', body: commandNode.body };
        const blockResult = blockCompiler.compile(programNode);
        return this.addConstant(blockResult);
    }

    compileCommand(command) {
        const name = command.name.value;
        const args = command.args;

        switch (name) {
            case 'set':
                this.compileArg(args[1]); // value
                this.compileArg(args[0]); // name
                this.emit(Opcodes.SET_STATE);
                break;

            case 'l':
            case 'label':
            case 'b':
            case 'button': {
                const options = name.startsWith('l') ? { initialText: args[1].value } : { label: args[1].value };
                const type = name.startsWith('l') ? 'LABEL' : 'BUTTON';
                this.emit(Opcodes.PUSH_CONST, this.addConstant(options));
                this.emit(Opcodes.PUSH_CONST, this.addConstant(type));
                this.compileArg(args[0]); // widget name
                this.emit(Opcodes.CREATE_WIDGET);
                break;
            }
            
            case 'i':
            case 'input':
            case 'listbox':
            case 'canvas':
                 // Simplified: these would have more complex option handling in a real scenario
                this.emit(Opcodes.PUSH_CONST, this.addConstant({}));
                this.emit(Opcodes.PUSH_CONST, this.addConstant(name.toUpperCase()));
                this.compileArg(args[0]);
                this.emit(Opcodes.CREATE_WIDGET);
                break;

            case 'conf':
            case 'pack': {
                const options = args.slice(1);
                for (let i = 0; i < options.length; i += 2) {
                    this.compileArg(options[i + 1]); // value
                    this.compileArg(options[i]);   // key
                }
                this.emit(Opcodes.BUILD_OBJ, options.length / 2);
                this.compileArg(args[0]); // widget name
                this.emit(name === 'conf' ? Opcodes.UPDATE_WIDGET : Opcodes.PACK_WIDGET);
                break;
            }

            case 'bind': {
                for (const eventCmd of command.body) {
                    const blockConstIndex = this.compileBlock(eventCmd);
                    this.emit(Opcodes.DEF_BLOCK, blockConstIndex);
                    this.compileArg(eventCmd.name);
                }
                this.compileArg(args[0]); // widget name
                this.emit(Opcodes.BIND_WIDGET, command.body.length);
                break;
            }

            case 'watch': {
                const blockConstIndex = this.compileBlock(command);
                this.emit(Opcodes.DEF_BLOCK, blockConstIndex);
                this.compileArg(args[0]); // variable name
                this.emit(Opcodes.WATCH_STATE);
                break;
            }

            case 'proc': {
                const blockConstIndex = this.compileBlock(command);
                this.emit(Opcodes.DEF_BLOCK, blockConstIndex);
                for (let i = 1; i < args.length; i++) {
                    this.compileArg(args[i]);
                }
                this.compileArg(args[0]); // proc name
                this.emit(Opcodes.DEF_PROC, args.length - 1);
                break;
            }

            case 'http.get': {
                 for (const callbackCmd of command.body) {
                    const blockConstIndex = this.compileBlock(callbackCmd);
                    this.emit(Opcodes.DEF_BLOCK, blockConstIndex);
                    this.compileArg(callbackCmd.name);
                }
                this.compileArg(args[0]); // url
                this.emit(Opcodes.HTTP_GET, command.body.length);
                break;
            }

            default:
                // Handle general procedure calls
                for (const arg of args) {
                    this.compileArg(arg);
                }
                this.emit(Opcodes.PUSH_CONST, this.addConstant(name));
                this.emit(Opcodes.CALL_PROC, args.length);
                break;
        }
    }
}
