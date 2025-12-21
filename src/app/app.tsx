import React from "react";
import ReactDOM from "react-dom";
import Compressor, { type ICompressorSettings } from "./Compressor";
import Db from "./Db";
import { CompressorGraph, Graph2 } from "./Graph";
import Sound from "./Sound";
import Timer from "./Timer";
import /* Waveform, */ { Waveform2 } from "./Waveform";

// https://vite.dev/guide/assets#explicit-url-imports
import CollectorAudioWorkletFile from "./CollectorAudioWorklet.js?url";
import { absMeanSample, rmsSample } from "./samples";

interface IAppProps {}

interface IAppState {
    audioContext: AudioContext | null,
    audioBuffer: AudioBuffer | null,
    audioLoadTimeMs: number,

    audioSound: Sound | null,

    transformedResult: CompressedRenderResult | null,
    transformedRenderTimeMs: number,

    transformedSound: Sound | null,

    compressor: ICompressorSettings,
    shouldRemoveMakeupGain: boolean,
}

export default class App extends React.Component<IAppProps, IAppState>
{
    private audioRef: React.RefObject<HTMLAudioElement | null>;

    constructor(props: IAppProps) {
        super(props);

        this.audioRef = React.createRef();
        this.state = {
            audioSound: null,
            audioContext: null,
            audioBuffer: null,
            audioLoadTimeMs: 0,

            transformedResult: null,
            transformedRenderTimeMs: 0,

            transformedSound: null,

            compressor: {
                threshold: -20,
                ratio: 4,
                knee: 0,
                attack: .03,
                release: .25
            },
            shouldRemoveMakeupGain: true,
        };
    }

    public async componentDidMount()
    {
        // if (!this.audioRef || !this.audioRef.current) {
        //     throw new Error("Expected an audio ref");
        // }

        const timer = new Timer();

        // const buffer = await fetchAudioBuffer("notrack/FourMoreWeeks_VansInJapan.mp3");
        // const buffer = await fetchAudioBuffer("notrack/MS0901_SnareNoComp.wav"); // YOU CAN HEAR THE DIFF!
        const buffer = await fetchAudioBuffer("heaven-wasnt-made-for-me.mp3");
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
        const hasRenderedTransform = !!this.state.transformedResult;
        const thresholdChanged = this.state.compressor.threshold != prevState.compressor.threshold;
        const ratioChanged = this.state.compressor.ratio != prevState.compressor.ratio;
        const attackChanged = this.state.compressor.attack != prevState.compressor.attack;
        const releaseChanged = this.state.compressor.release != prevState.compressor.release;
        const shouldRemoveMakeupGainChanged = this.state.shouldRemoveMakeupGain != prevState.shouldRemoveMakeupGain;

        if (!hasRenderedTransform || thresholdChanged || ratioChanged || attackChanged || releaseChanged || shouldRemoveMakeupGainChanged) {
            const timer = new Timer();
            const result = await renderCompressedChain(
                this.state.audioBuffer!,
                this.state.compressor,
                this.state.shouldRemoveMakeupGain
            );

            console.log("Rendered compressed chain", result.reduction);

            this.setState({
                transformedResult: result,
                transformedRenderTimeMs: timer.stop()
            });
        }
    }

    public render() {
        const channelData = this.state.audioBuffer?.getChannelData(0);
        const WAVEFORM_WIDTH = 1000;

        const calcTimer = new Timer();

        const pureWaveform = channelData;
        const transformedData = this.state.transformedResult?.outputBuffer.getChannelData(0);
        const calculationTime = calcTimer.stop();

        const getUpdatedCompressorSettings = (partial: Partial<ICompressorSettings>): ICompressorSettings => {
            return Object.assign({}, this.state.compressor, partial);
        };

        const attenuateLinear = (linearValue: number) => {
            if (Math.abs(linearValue) < 0.0001) {
                return 1.0;
            } else {
                const shapedInput = Compressor.compressCurveLinear(Math.abs(linearValue), this.state.compressor);
                return shapedInput / Math.abs(linearValue);
            }
        };
        const compressorGraphs = <>
            <p>Compressor curve &amp; attenuation</p>
            <Graph2 height={300} width={300}
                xRange={[0, 1]}
                yRange={[0, 1]}
                title="Compressor Curve (linear)"
                fn={(x) => Compressor.compressCurveLinear(Math.abs(x), this.state.compressor)} />
            <Graph2 height={300} width={300}
                xRange={[0, 1]}
                yRange={[0, 1]}
                title="Attenuation (linear)"
                fn={(x) => (attenuateLinear(x))} />
            <Graph2 height={300} width={300}
                xRange={[-100, 0]}
                yRange={[-100, 0]}
                title="Attenuation (dB)"
                fn={(x) => (Db.linearToDb(attenuateLinear(Db.dbToLinear(x))))} />
            <CompressorGraph height={300} width={300}
                compressorSettings={this.state.compressor} />
        </>;

        const waveformsToShow = [];
        if (pureWaveform) {
            waveformsToShow.push({ numbers: pureWaveform, color: "red" });
        }
        if (transformedData) {
            waveformsToShow.push({ numbers: transformedData, color: "blue" });
        }

        return <>
            <h1>Compressor Visualizer</h1>

            <p>
                Click and drag to move the waveform. Shift+scroll to zoom in/out.
            </p>

            <ul>
                <li>Analysis time: {calculationTime}ms</li>
                <li>Modifying time: {this.state.transformedRenderTimeMs}ms</li>
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

            <button onClick={this.handlePlayModified}>
                {this.state.transformedSound?.isPlaying() 
                    ? "Pause transformed"
                    : (this.state.audioSound?.isPlaying())
                        ? "Switch to transformed"
                        : "Play transformed"
                }
            </button>

            <p>Combined Waveforms</p>
            {
                waveformsToShow.length > 0
                ? <Waveform2 
                    width={WAVEFORM_WIDTH}
                    waveforms={waveformsToShow}
                    sampleRate={this.state.audioBuffer?.sampleRate}
                    compressorSettings={this.state.compressor} />
                : null
            }

            <fieldset>
                <legend>Controls</legend>

                <p>threshold</p>
                <label>
                    threshold (dB)
                    <input type="number"
                        value={this.state.compressor.threshold}
                        min={-100}
                        max={0}
                        step={1}
                        onChange={(e) => this.setState({ compressor: getUpdatedCompressorSettings({ threshold: e.target.valueAsNumber }) })} />
                </label>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ threshold: -90 }) })}>-90</button>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ threshold: -50 }) })}>-50</button>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ threshold: -30 }) })}>-30</button>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ threshold: -20 }) })}>-20</button>
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
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ ratio: 6 }) })}>6</button>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ ratio: 2 }) })}>2</button>
                <p>knee</p>

                <label>
                    attack (s)
                    <input type="number"
                        value={this.state.compressor.attack}
                        min={0}
                        max={1}
                        step={0.1}
                        onChange={(e) => this.setState({ compressor: getUpdatedCompressorSettings({ attack: e.target.valueAsNumber }) })} />
                </label>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ attack: 0.3 }) })}>300ms</button>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ attack: 0.03 }) })}>30ms</button>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ attack: 0.003 }) })}>3ms</button>
                <br />

                <label>
                    release (s)
                    <input type="number"
                        value={this.state.compressor.release}
                        min={0}
                        max={1}
                        step={0.1}
                        onChange={(e) => this.setState({ compressor: getUpdatedCompressorSettings({ release: e.target.valueAsNumber }) })} />
                </label>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ release: 0.5 }) })}>500ms</button>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ release: 0.25 }) })}>250ms</button>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ release: 0.05 }) })}>50ms</button>
                <button onClick={() => this.setState({ compressor: getUpdatedCompressorSettings({ release: 0.005 }) })}>5ms</button>

                <p>gain</p>
                <label>
                    <input type="checkbox"
                        checked={this.state.shouldRemoveMakeupGain}
                        onChange={(e) => this.setState({ shouldRemoveMakeupGain: e.target.checked })} />
                    Remove makeup gain
                </label>
            </fieldset>

            {/* Debug compressor visualize */}
            {compressorGraphs}

            <p>Original (length {this.state.audioBuffer?.length}; load: {this.state.audioLoadTimeMs}ms)</p>
            {
                pureWaveform
                ? <Waveform2 width={WAVEFORM_WIDTH} waveforms={[{ numbers: pureWaveform, color: "black" }]} sampleRate={this.state.audioBuffer?.sampleRate} />
                : null
            }
            <p>Modified (load: {this.state.transformedRenderTimeMs}ms):</p>
            {(transformedData)
                ? <Waveform2 width={WAVEFORM_WIDTH} waveforms={[{ numbers: transformedData, color: "black" }]} sampleRate={this.state.audioBuffer?.sampleRate} />
                : null
            }

        </>;
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

type ChainFn = (context: OfflineAudioContext, bufferSource: AudioBufferSourceNode) => AudioNode;
type SuspendCallbackFn = () => void;

// Just give me a function that returns the AudioNode you want hooked up to the
// destination.
async function renderEffectsChain(
    inputBuffer: AudioBuffer,
    chainFn: ChainFn,
    suspendRateS: number | undefined = undefined,
    suspendCallbackFn: SuspendCallbackFn | undefined = undefined): Promise<AudioBuffer> {
    const audioContext = new OfflineAudioContext(inputBuffer.numberOfChannels, inputBuffer.length, inputBuffer.sampleRate);
    await audioContext.audioWorklet.addModule(CollectorAudioWorkletFile);
    // console.log(`Loaded audio worklet from ${CollectorAudioWorkletFile}`);

    const bufferSource = audioContext.createBufferSource();
    bufferSource.buffer = inputBuffer;

    const node = chainFn(audioContext, bufferSource);

    node.connect(audioContext.destination);
    // bufferSource.connect(audioContext.destination);
    // bufferSource.connect(compressor).connect(audioContext.destination);

    bufferSource.start();

    if (suspendRateS && suspendCallbackFn) {
        for (let t = 0; t < inputBuffer.duration; t += suspendRateS) {
            audioContext.suspend(t).then(() => {
                suspendCallbackFn();
                audioContext.resume();
            });
        }
    }

    return await audioContext.startRendering();
}

type CompressedRenderResult = {
    outputBuffer: AudioBuffer,
    reduction: Float32Array,
};

async function renderCompressedChain(inputBuffer: AudioBuffer, compressorState: ICompressorSettings, shouldRemoveMakeupGain: boolean): Promise<CompressedRenderResult> {
    let compressor: DynamicsCompressorNode;

    const suspendRateS = 0.1; // Suspend every 100ms
    const suspendCount = inputBuffer.duration / suspendRateS;
    console.log(`Will suspend ${suspendCount} times over ${inputBuffer.duration}s duration`);
    const suspendArray = new Float32Array(suspendCount);
    let suspendIndex = 0;

    const renderFn = (ctx: OfflineAudioContext, buf: AudioBufferSourceNode): AudioNode => {
        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = compressorState.threshold;
        compressor.knee.value = compressorState.knee;
        compressor.ratio.value = compressorState.ratio;
        compressor.attack.value = compressorState.attack;
        compressor.release.value = compressorState.release;

        // Invert the default makeup gain applied by the compressor.
        const gain = ctx.createGain();
        const makeupGainLinear = Compressor.makeupGainLinear(compressorState);
        const invertMakeupGain = 1 / makeupGainLinear;

        if (shouldRemoveMakeupGain) {
            gain.gain.value = invertMakeupGain;
        }

        const fullRangeGainDb = Compressor.fullRangeGainDb(compressorState);
        const fullRangeGainLinear = Compressor.fullRangeGainLinear(compressorState);
        const makeupGainDb = Compressor.makeupGainDb(compressorState);
        const invertedDb = Db.linearToDb(invertMakeupGain);
        let logString = `Default makeup gain: ${makeupGainDb.toFixed(2)}dB (${makeupGainLinear.toFixed(2)} linear)\n`;
        logString += `\tFull range gain: ${fullRangeGainDb.toFixed(2)}dB (${fullRangeGainLinear.toFixed(2)} linear)\n`;
        const appliedString = shouldRemoveMakeupGain ? "Applied" : "(Did not apply))";
        logString += `=> ${appliedString} inverted makeup gain: ${invertedDb.toFixed(2)}dB (${invertMakeupGain.toFixed(2)} linear)`;
        console.log(logString);

        // const collector = new AudioWorkletNode(ctx, "collector-audio-worklet");
        // collector.port.onmessage = (event) => {
        //     console.log("Collector received:", event.data);
        // };

        return buf.connect(compressor).connect(gain)/* .connect(collector) */;
    };

    const suspendFn = () => {
        suspendArray[suspendIndex++] = compressor.reduction;
    }

    const result = await renderEffectsChain(inputBuffer, renderFn, suspendRateS, suspendFn);
    return { outputBuffer: result, reduction: suspendArray };
}