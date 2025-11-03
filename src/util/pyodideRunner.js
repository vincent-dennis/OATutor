class PyodideRunner {
    constructor() {
        this._output = console.log;
        this._pyodide = null;
        this._ready = this._initialize();
    }

    async _initialize() {
        this._pyodide = await window.loadPyodide({
            stderr: (text) => this._output(text),
            stdout: (text) => this._output(text),
        })
    }

    async ready() {
        await this._ready;
    }

    setOutput(outputCallback) {
        this._output = outputCallback;
    }
    
    async run(code) {
        await this.ready();
        return this._pyodide.runPython(code);
    }
}

export default new PyodideRunner();