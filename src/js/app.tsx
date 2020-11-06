import "react";
import React from "react";
import ReactDOM from "react-dom";

interface IAppProps {}

interface IAppState {
    audioBufferSourceNode: AudioBufferSourceNode | null,
    audioContext: AudioContext | null,
    audioBuffer: AudioBuffer | null
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
            audioBuffer: null
        };
    }

    public async componentDidMount()
    {
        // if (!this.audioRef || !this.audioRef.current) {
        //     throw new Error("Expected an audio ref");
        // }

        const buffer = await fetchAudioBuffer("notrack/ryan.wav");
        console.log(buffer);
    
        const audioContext = new AudioContext();
        const bufferSource = audioContext.createBufferSource();
        bufferSource.buffer = buffer;
    
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -50;
        compressor.knee.value = 40;
        compressor.ratio.value = 12;
        compressor.attack.value = 0;
        compressor.release.value = 0.25;
    
        bufferSource.connect(audioContext.destination);
        // bufferSource.connect(compressor).connect(audioContext.destination);
    
        // bufferSource.start();

        this.setState({
            audioBuffer: buffer,
            audioBufferSourceNode: bufferSource,
            audioContext: audioContext
        });
    }

    public render() {
        return <>
            <h1>Compressor Visualizer</h1>

            {/* TODO: allow uploading */}
            {/* <audio controls
                src="notrack/ryan.wav"
                ref={this.audioRef}>
                Your browser does not support the audio element :(.
            </audio> */}
            <button onClick={this.handlePlay}>Play Audio Context</button>
            <p>visualizer here</p>
            <p>(output here)</p>
            <p>{this.state.audioBuffer?.length}</p>

            <fieldset>
                <legend>Controls</legend>

                <p>threshold</p>
                <p>ratio</p>
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