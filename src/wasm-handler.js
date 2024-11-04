// wasm-handler.js
window.WasmHandler = class {
    static async init() {
        try {
            console.log('Initializing WASM...');
            const wasmModule = await import('./slic.js');
            
            // createModule should be the exported function
            const module = await wasmModule.createModule();
            console.log('WASM module initialized:', module);
            
            const processor = new module.SLICProcessor();
            return processor;
        } catch (err) {
            console.error('WASM initialization error:', err);
            throw err;
        }
    }
}