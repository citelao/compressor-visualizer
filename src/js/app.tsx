import React from "react";
import ReactDOM from "react-dom";
import Timer from "./timer";
import Waveform from "./Waveform";

interface IAppProps {}

interface IAppState {
    audioBufferSourceNode: AudioBufferSourceNode | null,
    audioContext: AudioContext | null,
    audioBuffer: AudioBuffer | null,
    audioLoadTimeMs: number,

    transformedBuffer: AudioBuffer | null,
    transformedRenderTimeMs: number,

    compressor: {
        threshold: number,
        ratio: number,
    }
}

class App extends React.Component<IAppProps, IAppState>
{
    private audioRef: React.RefObject<HTMLAudioElement>;

    constructor(props: IAppProps) {
        super(props);

        this.audioRef = React.createRef();
        this.state = {
            audioBufferSourceNode: null,
            audioContext: null,
            audioBuffer: null,
            audioLoadTimeMs: 0,

            transformedBuffer: null,
            transformedRenderTimeMs: 0,

            compressor: {
                threshold: -50,
                ratio: 2,
            }
        };
    }

    public async componentDidMount()
    {
        // if (!this.audioRef || !this.audioRef.current) {
        //     throw new Error("Expected an audio ref");
        // }

        const timer = new Timer();

        const buffer = await fetchAudioBuffer("notrack/ryan.wav");
        console.log(buffer);
    
        const audioContext = new AudioContext();
        const bufferSource = audioContext.createBufferSource();
        bufferSource.buffer = buffer;
    
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = this.state.compressor.threshold;
        compressor.knee.value = 40;
        compressor.ratio.value = this.state.compressor.ratio;
        compressor.attack.value = 0;
        compressor.release.value = 0.25;

        bufferSource.connect(audioContext.destination);
        // bufferSource.connect(compressor).connect(audioContext.destination);

        this.setState({
            audioBuffer: buffer,
            audioBufferSourceNode: bufferSource,
            audioContext: audioContext,
            audioLoadTimeMs: timer.stop()
        });
    }

    public async componentDidUpdate(prevProps: IAppProps, prevState: IAppState) {
        const hasRenderedTransform = !!this.state.transformedBuffer;
        const thresholdChanged = this.state.compressor.threshold != prevState.compressor.threshold;
        const ratioChanged = this.state.compressor.ratio != prevState.compressor.ratio;
        if (!hasRenderedTransform || thresholdChanged || ratioChanged) {
            const timer = new Timer();
            const effectsBuffer = await renderEffectsChain(this.state.audioBuffer!, (ctx, buf) => {
                const compressor = ctx.createDynamicsCompressor();
                compressor.threshold.value = this.state.compressor.threshold;
                compressor.knee.value = 40;
                compressor.ratio.value = this.state.compressor.ratio;
                compressor.attack.value = 0;
                compressor.release.value = 0.25;

                const gain = ctx.createGain();
                // https://www.w3.org/TR/webaudio/#compression-curve
                // https://www.w3.org/TR/webaudio/#computing-the-makeup-gain
                const gainToLinear = (decibel: number) => {
                    return Math.pow(10, (decibel / 20));
                }
                const compressionCurve = (input: number) => {
                    // TODO
                    const linearThreshold = gainToLinear(this.state.compressor.threshold);
                    const linearKnee = gainToLinear(this.state.compressor.ratio);
                    if (input < linearThreshold) {
                        return input;
                    } else if (input < linearThreshold + linearKnee) {
                        // User-agent dependent
                        // TODO
                        return input;
                    } else {
                        return (1 / this.state.compressor.ratio) * input;
                    }
                };
                const fullMakeupGain = 1 / compressionCurve(1.0);
                const makeupGain = 0.6 * fullMakeupGain;
                const invertMakeupGain = 1 / makeupGain;
                gain.gain.value = invertMakeupGain;

                console.log(`Makeup gain: ${makeupGain} (full: ${fullMakeupGain}), Applied: ${invertMakeupGain}`);

                return buf.connect(compressor).connect(gain);
            });

            this.setState({
                transformedBuffer: effectsBuffer,
                transformedRenderTimeMs: timer.stop()
            });
        }
    }

    public render() {
        const channelData = this.state.audioBuffer?.getChannelData(0);
        const SAMPLES = 1000;
        const WAVEFORM_WIDTH = 1000;

        let maxWaveform;
        let meanWaveform;
        let rmsWaveform;
        if (channelData) {
            maxWaveform = absMaxSample(channelData, SAMPLES);
            meanWaveform = absMeanSample(channelData, SAMPLES);
            rmsWaveform = rmsSample(channelData, SAMPLES);
        }

        const transformedData = this.state.transformedBuffer?.getChannelData(0);
        let transformedMaxWaveform;
        let transformedMeanWaveform;
        let transformedRmsWaveform;
        if (transformedData) {
            transformedMaxWaveform = absMaxSample(transformedData, SAMPLES);
            transformedMeanWaveform = absMeanSample(transformedData, SAMPLES);
            transformedRmsWaveform = rmsSample(transformedData, SAMPLES);
        }

        return <>
            <h1>Compressor Visualizer</h1>

            {/* TODO: allow uploading */}
            {/* <audio controls
                src="notrack/ryan.wav"
                ref={this.audioRef}>
                Your browser does not support the audio element :(.
            </audio> */}
            <button onClick={this.handlePlay}>Play Audio Context</button>
            <p>Original (length {this.state.audioBuffer?.length}; load: {this.state.audioLoadTimeMs}ms)</p>
            {(maxWaveform && meanWaveform && rmsWaveform)
                ? <Waveform width={WAVEFORM_WIDTH} numbers={[maxWaveform, meanWaveform, rmsWaveform]} />
                : null
            }
            <p>Modified (load: {this.state.transformedRenderTimeMs}ms):</p>
            {(transformedMaxWaveform && transformedMeanWaveform && transformedRmsWaveform)
                ? <Waveform width={WAVEFORM_WIDTH} numbers={[transformedMaxWaveform, transformedMeanWaveform, transformedRmsWaveform]} />
                : null
            }

            <fieldset>
                <legend>Controls</legend>

                <p>threshold</p>
                <button onClick={() => this.setState({ compressor: { threshold: -90, ratio: this.state.compressor.ratio } })}>-90</button>
                <button onClick={() => this.setState({ compressor: { threshold: -50, ratio: this.state.compressor.ratio } })}>-50</button>
                <button onClick={() => this.setState({ compressor: { threshold: -10, ratio: this.state.compressor.ratio } })}>-10</button>
                <p>ratio</p>
                <button onClick={() => this.setState({ compressor: { threshold: this.state.compressor.threshold, ratio: 20 } })}>20</button>
                <button onClick={() => this.setState({ compressor: { threshold: this.state.compressor.threshold, ratio: 12 } })}>12</button>
                <button onClick={() => this.setState({ compressor: { threshold: this.state.compressor.threshold, ratio: 2 } })}>2</button>
                <p>knee</p>

                <p>attack</p>
                <p>release</p>
                <p>gain</p>
            </fieldset>
        </>;
    }

    private handlePlay = () => {
        if (!this.state.audioContext || !this.state.audioBufferSourceNode) {
            throw new Error("You need an audio context");
        }

        // if (this.state.audioContext.state === "suspended") {
        //     this.state.audioContext.resume();
        // }

        this.state.audioBufferSourceNode.start();
    }
}

const app = document.getElementById("app");
ReactDOM.render(<App />, app);

async function fetchAudioBuffer(uri: string): Promise<AudioBuffer> {
    return new Promise<AudioBuffer>((resolve, reject) => {
        try {
            // https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext
            const CHANNELS = 2;
            const SAMPLE_RATE = 44100;
            const LENGTH_S = 40;
            const SAMPLE_COUNT = SAMPLE_RATE * LENGTH_S;
            const audioContext = new AudioContext();
            const offlineContext = new OfflineAudioContext(CHANNELS, SAMPLE_COUNT, SAMPLE_RATE);
            const request = new XMLHttpRequest();
            const bufferSource = offlineContext.createBufferSource();
            request.open("GET", uri, true);
            request.responseType = "arraybuffer";
            request.onload = function() {
                const audioData = request.response;
                
                audioContext.decodeAudioData(audioData, function(decodedData) {
                    bufferSource.buffer = decodedData;
                    bufferSource.connect(offlineContext.destination);
                    bufferSource.start();

                    offlineContext.startRendering().then(function(renderedBuffer) {
                        console.log("Rendered", renderedBuffer.length);
                        resolve(renderedBuffer);
                    });
                });
            }
            request.send();
        } catch(e) {
            reject(e);
        }
    });
}

function randomSample(arr: Float32Array, samples: number): Float32Array {
    const outputArray = new Float32Array(samples);

    const groupSize = Math.floor(arr.length / samples);
    for (let index = 0; index < samples; index++) {
        const inputIndex = groupSize * index;
        outputArray[index] = arr[inputIndex];
    }

    return outputArray;
}

function absMaxSample(arr: Float32Array, samples: number): Float32Array {
    const outputArray = new Float32Array(samples);

    const groupSize = Math.floor(arr.length / samples);
    for (let index = 0; index < samples; index++) {
        const beginIndex = groupSize * index;
        const endIndex = groupSize * (index + 1);
        const subArray = arr.subarray(beginIndex, endIndex);
        const max = subArray.reduce((max, v) => Math.max(max, Math.abs(v)), - Infinity);
        outputArray[index] = max;
    }

    return outputArray;
}

function meanSample(arr: Float32Array, samples: number): Float32Array {
    const outputArray = new Float32Array(samples);

    const groupSize = Math.floor(arr.length / samples);
    for (let index = 0; index < samples; index++) {
        const beginIndex = groupSize * index;
        const endIndex = groupSize * (index + 1);
        const subArray = arr.subarray(beginIndex, endIndex);
        const mean = (subArray.reduce((acc, v) => acc + v, 0)) / subArray.length;
        outputArray[index] = mean;
    }

    return outputArray;
}

function absMeanSample(arr: Float32Array, samples: number): Float32Array {
    const outputArray = new Float32Array(samples);

    const groupSize = Math.floor(arr.length / samples);
    console.log(groupSize);
    for (let index = 0; index < samples; index++) {
        const beginIndex = groupSize * index;
        const endIndex = groupSize * (index + 1);
        const subArray = arr.subarray(beginIndex, endIndex);
        // console.log(subArray.length);
        const mean = (subArray.reduce((acc, v) => acc + Math.abs(v), 0)) / subArray.length;
        outputArray[index] = mean;
    }

    return outputArray;
}

function rmsSample(arr: Float32Array, samples: number): Float32Array {
    const outputArray = new Float32Array(samples);

    const groupSize = Math.floor(arr.length / samples);
    for (let index = 0; index < samples; index++) {
        const beginIndex = groupSize * index;
        const endIndex = groupSize * (index + 1);
        const subArray = arr.subarray(beginIndex, endIndex);
        const sumOfSquares = (subArray.reduce((acc, v) => acc + (v * v), 0));
        outputArray[index] = Math.sqrt(sumOfSquares / subArray.length);
    }

    return outputArray;
}

// Just give me a function that returns the AudioNode you want hooked up to the
// destination.
async function renderEffectsChain(inputBuffer: AudioBuffer, chainFn: (context: OfflineAudioContext, bufferSource: AudioBufferSourceNode) => AudioNode): Promise<AudioBuffer> {
    const audioContext = new OfflineAudioContext(inputBuffer.numberOfChannels, inputBuffer.length, inputBuffer.sampleRate);
    const bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = inputBuffer;

    const node = chainFn(audioContext, bufferSource);

    node.connect(audioContext.destination);
    bufferSource.connect(audioContext.destination);
    // bufferSource.connect(compressor).connect(audioContext.destination);

    bufferSource.start();
    return await audioContext.startRendering();
}