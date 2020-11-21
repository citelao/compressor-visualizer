import React from "react";
import ReactDOM from "react-dom";
import Db from "./Db";
import Sound from "./Sound";
import Timer from "./timer";
import Waveform from "./Waveform";

interface IAppProps {}

interface ICompressorSettings {
    threshold: number,
    ratio: number,
    knee: number,
    attack: number,
    release: number,
}

interface IAppState {
    audioContext: AudioContext | null,
    audioBuffer: AudioBuffer | null,
    audioLoadTimeMs: number,

    audioSound: Sound | null,

    transformedBuffer: AudioBuffer | null,
    transformedRenderTimeMs: number,

    transformedSound: Sound | null,

    compressor: ICompressorSettings,

    samples: number
}

class App extends React.Component<IAppProps, IAppState>
{
    private audioRef: React.RefObject<HTMLAudioElement>;

    constructor(props: IAppProps) {
        super(props);

        this.audioRef = React.createRef();
        this.state = {
            audioSound: null,
            audioContext: null,
            audioBuffer: null,
            audioLoadTimeMs: 0,

            transformedBuffer: null,
            transformedRenderTimeMs: 0,

            transformedSound: null,

            compressor: {
                threshold: -50,
                ratio: 2,
                knee: 0,
                attack: .003,
                release: .25
            },

            samples: 500
        };
    }

    public async componentDidMount()
    {
        // if (!this.audioRef || !this.audioRef.current) {
        //     throw new Error("Expected an audio ref");
        // }

        const timer = new Timer();

        // const buffer = await fetchAudioBuffer("notrack/FourMoreWeeks_VansInJapan.mp3");
        const buffer = await fetchAudioBuffer("notrack/MS0901_SnareNoComp.wav"); // YOU CAN HEAR THE DIFF!
        // const buffer = await fetchAudioBuffer("notrack/MS0908_Drums1NoComp_MR1001.wav"); // You can hear a diff!
        // const buffer = await fetchAudioBuffer("notrack/MS0912_GtrNoComp_MR0702.wav");
        console.log(buffer, absMeanSample(buffer.getChannelData(0), 1), rmsSample(buffer.getChannelData(0), 1));

        const audioContext = new AudioContext();

        const audioSound = new Sound(audioContext, buffer);

        // const bufferSource = audioContext.createBufferSource();
        // bufferSource.buffer = buffer;
    
        // const compressor = audioContext.createDynamicsCompressor();
        // compressor.threshold.value = this.state.compressor.threshold;
        // compressor.knee.value = this.state.compressor.knee;
        // compressor.ratio.value = this.state.compressor.ratio;
        // compressor.attack.value = this.state.compressor.attack;
        // compressor.release.value = this.state.compressor.release;

        // bufferSource.connect(audioContext.destination);
        // // bufferSource.connect(compressor).connect(audioContext.destination);

        this.setState({
            audioBuffer: buffer,
            audioContext: audioContext,
            audioLoadTimeMs: timer.stop(),
            audioSound: audioSound
        });
    }

    public async componentDidUpdate(prevProps: IAppProps, prevState: IAppState) {
        const hasRenderedTransform = !!this.state.transformedBuffer;
        const thresholdChanged = this.state.compressor.threshold != prevState.compressor.threshold;
        const ratioChanged = this.state.compressor.ratio != prevState.compressor.ratio;
        const attackChanged = this.state.compressor.attack != prevState.compressor.attack;
        const releaseChanged = this.state.compressor.release != prevState.compressor.release;
        if (!hasRenderedTransform || thresholdChanged || ratioChanged || attackChanged || releaseChanged) {
            const timer = new Timer();
            const effectsBuffer = await renderEffectsChain(this.state.audioBuffer!, (ctx, buf) => {
                const compressor = ctx.createDynamicsCompressor();
                compressor.threshold.value = this.state.compressor.threshold;
                compressor.knee.value = this.state.compressor.knee;
                compressor.ratio.value = this.state.compressor.ratio;
                compressor.attack.value = this.state.compressor.attack;
                compressor.release.value = this.state.compressor.release;

                const gain = ctx.createGain();
                const compressionCurve = (input: number) => {
                    // TODO
                    const linearThreshold = Db.dbToLinear(this.state.compressor.threshold);
                    const linearKneeEnd =  Db.dbToLinear(this.state.compressor.threshold + this.state.compressor.knee);
                    console.log(`threshold: ${linearThreshold}; knee end: ${linearKneeEnd}`)
                    if (input < linearThreshold) {
                        return input;
                    } else if (input < linearKneeEnd) {
                        // User-agent dependent
                        // TODO
                        return input;
                    } else {
                        return (1 / this.state.compressor.ratio) * input;
                    }
                };
                console.log(compressionCurve(0.0), compressionCurve(0.03), compressionCurve(0.3))
                const fullMakeupGain = 1 / compressionCurve(1.0);
                const makeupGain = Math.pow(fullMakeupGain, 0.6);
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
        const samples = this.state.samples;
        const WAVEFORM_WIDTH = 1000;

        const offset = 12000;
        const size = 500;
        console.log(`Group size: ${getGroupSize(size, samples)}`);
        const viewWidthS = (this.state.audioBuffer)
            ? size / this.state.audioBuffer.sampleRate
            : 0;
        const DIGITS = 3;
        const truncatedViewWidthS = Math.trunc(viewWidthS * Math.pow(10, DIGITS)) / Math.pow(10, DIGITS);
        console.log(`Viewing: ${truncatedViewWidthS}s`)

        const calcTimer = new Timer();
        let maxWaveform;
        let meanWaveform;
        let rmsWaveform;
        if (channelData) {
            const subpart = channelData.subarray(offset, offset + size);
            maxWaveform = absMaxSample(subpart, samples);
            meanWaveform = absMeanSample(subpart, samples);
            rmsWaveform = rmsSample(subpart, samples);

            // console.log(subpart);
        }

        const transformedData = this.state.transformedBuffer?.getChannelData(0);
        let transformedMaxWaveform;
        let transformedMeanWaveform;
        let transformedRmsWaveform;
        if (transformedData) {
            const subpart = transformedData.subarray(offset, offset + size);
            transformedMaxWaveform = absMaxSample(subpart, samples);
            transformedMeanWaveform = absMeanSample(subpart, samples);
            transformedRmsWaveform = rmsSample(subpart, samples);
        }
        const calculationTime = calcTimer.stop();

        const getUpdatedCompressorSettings = (partial: Partial<ICompressorSettings>): ICompressorSettings => {
            return Object.assign({}, this.state.compressor, partial);
        };

        return <>
            <h1>Compressor Visualizer</h1>

            <ul>
                <li>Analysis time: {calculationTime}ms</li>
            </ul>

            {/* TODO: allow uploading */}
            {/* <audio controls
                src="notrack/ryan.wav"
                ref={this.audioRef}>
                Your browser does not support the audio element :(.
            </audio> */}
            <button onClick={this.handlePlayOriginal}>
                {this.state.audioSound?.isPlaying() 
                    ? "Pause original"
                    : (this.state.transformedSound?.isPlaying())
                        ? "Switch to original"
                        : "Play original"
                }
            </button>
            <p>Original (length {this.state.audioBuffer?.length}; load: {this.state.audioLoadTimeMs}ms)</p>
            {(maxWaveform && meanWaveform && rmsWaveform)
                ? <Waveform width={WAVEFORM_WIDTH} numbers={[maxWaveform, meanWaveform, rmsWaveform]} />
                : null
            }
            <button onClick={this.handlePlayModified}>
                {this.state.transformedSound?.isPlaying() 
                    ? "Pause transformed"
                    : (this.state.audioSound?.isPlaying())
                        ? "Switch to transformed"
                        : "Play transformed"
                }
            </button>
            <p>Modified (load: {this.state.transformedRenderTimeMs}ms):</p>
            {(transformedMaxWaveform && transformedMeanWaveform && transformedRmsWaveform)
                ? <Waveform width={WAVEFORM_WIDTH} numbers={[transformedMaxWaveform, transformedMeanWaveform, transformedRmsWaveform]} />
                : null
            }

            <fieldset>
                <legend>Controls</legend>

                <label>
                    View resolution
                    <input type="range" onChange={this.handleResolutionChange} value={Math.log2(samples)} min={1} max={Math.log2(WAVEFORM_WIDTH)} />
                </label>

                <p>threshold</p>
                <label>
                    threshold
                    <input type="number"
                        value={this.state.compressor.threshold}
                        min={-100}
                        max={0}
                        step={5}
                        onChange={(e) => this.setState({ compressor: getUpdatedCompressorSettings({ threshold: e.target.valueAsNumber }) })} />
                </label>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ threshold: -90 }) })}>-90</button>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ threshold: -50 }) })}>-50</button>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ threshold: -10 }) })}>-10</button>

                <p>ratio</p>
                <label>
                    ratio
                    <input type="number"
                        value={this.state.compressor.ratio}
                        min={1}
                        max={20}
                        step={1}
                        onChange={(e) => this.setState({ compressor: getUpdatedCompressorSettings({ ratio: e.target.valueAsNumber }) })} />
                </label>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ ratio: 20 }) })}>20</button>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ ratio: 12 }) })}>12</button>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ ratio: 2 }) })}>2</button>
                <p>knee</p>

                <label>
                    attack
                    <input type="number"
                        value={this.state.compressor.attack}
                        min={0}
                        max={1}
                        step={0.1}
                        onChange={(e) => this.setState({ compressor: getUpdatedCompressorSettings({ attack: e.target.valueAsNumber }) })} />
                </label>

                <label>
                    release
                    <input type="number"
                        value={this.state.compressor.release}
                        min={0}
                        max={1}
                        step={0.1}
                        onChange={(e) => this.setState({ compressor: getUpdatedCompressorSettings({ release: e.target.valueAsNumber }) })} />
                </label>
                
                <p>gain</p>
            </fieldset>
        </>;
    }
    
    private handleResolutionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const resolution = Math.pow(2, e.target.valueAsNumber);

        this.setState({
            samples: resolution
        });
    }

    private handlePlayOriginal = () => {
        if (!this.state.audioContext || !this.state.audioSound) {
            throw new Error("You need an audio context");
        }

        if (this.state.audioSound.isPlaying()) {
            console.log("Pausing original!");
            this.state.audioSound.pause();
        } else {
            if (this.state.transformedSound?.isPlaying()) {
                console.log("Switching to original");
                const transformedElapsedMs = this.state.transformedSound?.getElapsedMs() || 0;
                this.state.transformedSound?.stop();
                this.state.audioSound.start(0, transformedElapsedMs / 1000);
            } else {
                console.log("Resuming original");
                this.state.audioSound.play();
            }
        }
    }

    private handlePlayModified = () => {
        if (!this.state.audioContext || !this.state.transformedBuffer) {
            throw new Error("You need an audio context and transformed buffer");
        }

        // if (this.state.audioContext.state === "suspended") {
        //     this.state.audioContext.resume();
        // }

        if (this.state.transformedSound?.isPlaying()) {
            console.log("Pausing transformed!");
            this.state.transformedSound.pause();
        } else {
            const sound = new Sound(this.state.audioContext, this.state.transformedBuffer);

            if (this.state.audioSound?.isPlaying()) {
                console.log("Switching to transformed");
                const audioElapsedMs = this.state.audioSound?.getElapsedMs() || 0;
                this.state.audioSound?.stop();
                sound.start(0, audioElapsedMs / 1000);
            } else {
                console.log("Resuming transformed");
                const elapsedMs = this.state.transformedSound?.getElapsedMs() || 0;
                sound.start(0, elapsedMs / 1000);
            }

            this.setState({
                transformedSound: sound
            });
        }
    }
}

const app = document.getElementById("app");
ReactDOM.render(<App />, app);

async function fetchAudioBuffer(uri: string): Promise<AudioBuffer> {
    return new Promise<AudioBuffer>((resolve, reject) => {
        try {
            // https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext
            const request = new XMLHttpRequest();
            request.open("GET", uri, true);
            request.responseType = "arraybuffer";
            request.onload = function() {
                const audioData = request.response;

                const audioContext = new AudioContext();
                audioContext.decodeAudioData(audioData, function(decodedData) {
                    console.log(`Audio data: ${decodedData.numberOfChannels} channels; ${decodedData.length} @ ${decodedData.sampleRate}Hz`);
                    const offlineContext = new OfflineAudioContext(decodedData.numberOfChannels, decodedData.length, decodedData.sampleRate);
                    const bufferSource = offlineContext.createBufferSource();
                    
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

function getGroupSize(length: number, samples: number): number {
    const groupSize = Math.max(Math.floor(length / samples), 1);
    return groupSize;
}

function randomSample(arr: Float32Array, samples: number): Float32Array {
    const outputArray = new Float32Array(samples);

    const groupSize = getGroupSize(arr.length, samples);
    for (let index = 0; index < samples; index++) {
        const inputIndex = groupSize * index;
        outputArray[index] = arr[inputIndex];
    }

    return outputArray;
}

function absMaxSample(arr: Float32Array, samples: number): Float32Array {
    const outputArray = new Float32Array(samples);

    const groupSize = getGroupSize(arr.length, samples);
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

    const groupSize = getGroupSize(arr.length, samples);
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

    const groupSize = getGroupSize(arr.length, samples);
    console.log(groupSize);
    for (let index = 0; index < samples; index++) {
        const beginIndex = groupSize * index;
        const endIndex = groupSize * (index + 1);
        const subArray = arr.subarray(beginIndex, endIndex);
        // console.log(beginIndex, endIndex, subArray.length);
        const mean = (subArray.reduce((acc, v) => acc + Math.abs(v), 0)) / subArray.length;
        outputArray[index] = mean;
    }

    return outputArray;
}

function rmsSample(arr: Float32Array, samples: number): Float32Array {
    const outputArray = new Float32Array(samples);

    const groupSize = getGroupSize(arr.length, samples);
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