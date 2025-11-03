class PyodideRunner {
    constructor() {
        this._output = console.log;
        this._pyodide = null;
        this._ready = null;
    }

    initialize() {
        if (!this._ready) {
            // Start the initialization process, which waits for window.loadPyodide
            console.log("Start pyodide initialization!");
            this._ready = this._initialize();
        }
    }

    async _initialize() {
        console.log("pyodide._initialize ...");
        while (typeof window.loadPyodide === 'undefined') {
            await new Promise(resolve => setTimeout(resolve, 50)); // Wait 50ms
        }
        this._pyodide = await window.loadPyodide({
            stderr: (text) => this._output(text),
            stdout: (text) => this._output(text),
        })
    }

    async ready() {
        await this._ready;
        console.log("Pyodide is ready!");
    }

    setOutput(outputCallback) {
        this._output = outputCallback;
    }
    
    async run(code) {
        await this.ready();
        return this._pyodide.runPython(code);
    }
}

const pyodideRunner = new PyodideRunner();
export default pyodideRunner;