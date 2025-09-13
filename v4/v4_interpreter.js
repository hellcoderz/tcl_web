import { Opcodes } from './v4_compiler.js';

/**
 * A runtime that interacts with a real DOM environment.
 */
class RealTCLWebRuntime {
    constructor(interpreter, rootElementId) {
        this.interpreter = interpreter;
        this.root = document.getElementById(rootElementId);
        if (!this.root) throw new Error(`Root element #${rootElementId} not found.`);
        
        this.root.style.display = 'flex';
        this.root.style.flexDirection = 'column'; // Default pack direction

        this.state = new Map();
        this.widgets = new Map();
        this.procs = new Map();
        this.watchers = new Map();
    }

    setState(name, value) {
        this.state.set(name, value);
        if (this.watchers.has(name)) {
            this.watchers.get(name).forEach(cb => cb(value));
        }
    }

    getState(name) {
        return this.state.get(name);
    }

    createWidget(name, type, options) {
        let element;
        switch (type) {
            case 'LABEL':
                element = document.createElement('label');
                element.textContent = options.initialText || '';
                break;
            case 'BUTTON':
                element = document.createElement('button');
                element.textContent = options.label || '';
                break;
            case 'INPUT':
                element = document.createElement('input');
                break;
            case 'LISTBOX':
                element = document.createElement('ul');
                break;
            case 'CANVAS':
                element = document.createElement('canvas');
                if (options.width) element.width = options.width;
                if (options.height) element.height = options.height;
                break;
            default:
                element = document.createElement('div');
        }
        element.id = name;
        this.widgets.set(name, element);
        // Default to packing in the root container
        this.root.appendChild(element);
    }

    updateWidget(name, options) {
        const widget = this.widgets.get(name);
        if (!widget) return;

        for (const key in options) {
            const value = options[key];
            switch (key) {
                case '-text': widget.textContent = value; break;
                case '-bg': widget.style.backgroundColor = value; break;
                case '-fg': widget.style.color = value; break;
                case '-width': widget.style.width = `${value}px`; break;
                case '-height': widget.style.height = `${value}px`; break;
                case '-value': widget.value = value; break;
                case '-items': // For listbox
                    if (widget.tagName === 'UL') {
                        widget.innerHTML = '';
                        value.forEach(item => {
                            const li = document.createElement('li');
                            li.textContent = item;
                            widget.appendChild(li);
                        });
                    }
                    break;
            }
        }
    }

    packWidget(name, options) {
        // This is a highly simplified version of a flexbox packer
        const widget = this.widgets.get(name);
        if (!widget) return;

        for (const key in options) {
            const value = options[key];
            switch (key) {
                case '-side': // This would be handled by the parent's flex-direction
                    break;
                case '-fill':
                    if (value === 'x') widget.style.width = '100%';
                    if (value === 'y') widget.style.height = '100%';
                    if (value === 'both') { 
                        widget.style.width = '100%'; 
                        widget.style.height = '100%';
                    }
                    break;
                case '-expand':
                    if (value === 'yes') widget.style.flexGrow = '1';
                    break;
                case '-padx': widget.style.paddingLeft = widget.style.paddingRight = `${value}px`; break;
                case '-pady': widget.style.paddingTop = widget.style.paddingBottom = `${value}px`; break;
            }
        }
    }

    bindWidget(name, eventHandlers) {
        const widget = this.widgets.get(name);
        if (!widget) return;
        for (const eventName in eventHandlers) {
            widget.addEventListener(eventName, eventHandlers[eventName]);
        }
    }

    watchState(varName, callback) {
        if (!this.watchers.has(varName)) {
            this.watchers.set(varName, []);
        }
        this.watchers.get(varName).push(callback);
    }

    defineProc(name, procData) {
        this.procs.set(name, procData);
    }
}

/**
 * The Bytecode Interpreter (Virtual Machine).
 * This class is identical to the previous version, but it now operates
 * on a RealTCLWebRuntime instance.
 */
export default class Interpreter {
    constructor(rootElementId) {
        this.runtime = new RealTCLWebRuntime(this, rootElementId);
        this.stack = [];
        this.ip = 0;
    }

    run(bytecode, constants) {
        this.ip = 0;
        while (this.ip < bytecode.length) {
            const instruction = bytecode[this.ip];
            const [opcode, ...operands] = instruction;
            this.ip++;

            switch (opcode) {
                case Opcodes.PUSH_CONST:
                    this.stack.push(constants[operands[0]]);
                    break;
                case Opcodes.PUSH_VAR: {
                    const varName = constants[operands[0]];
                    this.stack.push(this.runtime.getState(varName));
                    break;
                }
                case Opcodes.SET_STATE: {
                    const name = this.stack.pop();
                    const value = this.stack.pop();
                    this.runtime.setState(name, value);
                    break;
                }
                case Opcodes.BUILD_OBJ: {
                    const keyCount = operands[0];
                    const obj = {};
                    for (let i = 0; i < keyCount; i++) {
                        const key = this.stack.pop();
                        const value = this.stack.pop();
                        obj[key] = value;
                    }
                    this.stack.push(obj);
                    break;
                }
                case Opcodes.CREATE_WIDGET: {
                    const name = this.stack.pop();
                    const type = this.stack.pop();
                    const options = this.stack.pop();
                    this.runtime.createWidget(name, type, options);
                    break;
                }
                case Opcodes.UPDATE_WIDGET: {
                    const name = this.stack.pop();
                    const options = this.stack.pop();
                    this.runtime.updateWidget(name, options);
                    break;
                }
                case Opcodes.PACK_WIDGET: {
                    const name = this.stack.pop();
                    const options = this.stack.pop();
                    this.runtime.packWidget(name, options);
                    break;
                }
                case Opcodes.DEF_BLOCK:
                    this.stack.push(constants[operands[0]]);
                    break;
                case Opcodes.BIND_WIDGET: {
                    const eventCount = operands[0];
                    const widgetName = this.stack.pop();
                    const handlers = {};
                    for (let i = 0; i < eventCount; i++) {
                        const eventName = this.stack.pop().substring(1);
                        const block = this.stack.pop();
                        handlers[eventName] = () => {
                            this.run(block.bytecode, block.constants);
                        };
                    }
                    this.runtime.bindWidget(widgetName, handlers);
                    break;
                }
                case Opcodes.WATCH_STATE: {
                    const varName = this.stack.pop();
                    const block = this.stack.pop();
                    const callback = () => {
                        this.run(block.bytecode, block.constants);
                    };
                    this.runtime.watchState(varName, callback);
                    break;
                }
                case Opcodes.CALL_PROC: {
                    const argCount = operands[0];
                    const procName = this.stack.pop();
                    const procData = this.runtime.procs.get(procName);
                    if (!procData) throw new Error(`Procedure not found: ${procName}`);
                    this.run(procData.block.bytecode, procData.block.constants);
                    break;
                }
                case Opcodes.DEF_PROC: {
                    const argCount = operands[0];
                    const procName = this.stack.pop();
                    const args = [];
                    for (let i = 0; i < argCount; i++) args.push(this.stack.pop());
                    const block = this.stack.pop();
                    this.runtime.defineProc(procName, { args: args.reverse(), block });
                    break;
                }
                case Opcodes.HTTP_GET: {
                    const callbackCount = operands[0];
                    const url = this.stack.pop();
                    const callbacks = {};
                    for (let i = 0; i < callbackCount; i++) {
                        const callbackName = this.stack.pop();
                        const block = this.stack.pop();
                        callbacks[callbackName] = block;
                    }
                    fetch(url).then(res => res.json()).then(data => {
                        this.runtime.setState('http_response', data);
                        if (callbacks['.callback']) {
                            const cb = callbacks['.callback'];
                            this.run(cb.bytecode, cb.constants);
                        }
                    }).catch(err => {
                        this.runtime.setState('error', err);
                        if (callbacks['.error']) {
                            const cb = callbacks['.error'];
                            this.run(cb.bytecode, cb.constants);
                        }
                    });
                    break;
                }
                default:
                    throw new Error(`Unknown opcode: ${opcode}`);
            }
        }
    }
}
