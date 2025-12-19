/**
 * @typedef {Object} CollectorAudioWorklet
 * @property {MessagePort} port
 */
class CollectorAudioWorklet extends AudioWorkletProcessor {
    // port!: MessagePort;
    // private buffer: Float32Array[];

    constructor() {
        super();
        // this.buffer = [];
    }

    /**
     * 
     * @param {Float32Array[][]} inputs 
     * @param {Float32Array[][]} outputs 
     * @param {Record<string, Float32Array>} parameters 
     * @returns {boolean}
     */
    process(inputs, outputs, parameters) {
        // Simply send a message with some of the input data for demonstration
        // this.port.postMessage({ input: inputs[0][0][0] });
        // outputs = inputs;

        return false;
    }
}

registerProcessor('collector-audio-worklet', CollectorAudioWorklet);

// Generates infinite white noise, I believe.
// https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor#examples
//
// class WhiteNoiseProcessor extends AudioWorkletProcessor {
//   process(inputs, outputs, parameters) {
//     const output = outputs[0];
//     output.forEach((channel) => {
//       for (let i = 0; i < channel.length; i++) {
//         channel[i] = Math.random() * 2 - 1;
//       }
//     });
//     return true;
//   }
// }

// registerProcessor("white-noise-processor", WhiteNoiseProcessor);