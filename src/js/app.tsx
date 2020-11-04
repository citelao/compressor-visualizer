import "react";
import React from "react";
import ReactDOM from "react-dom";

interface IAppProps {}

interface IAppState {
    audioNode: AudioNode | null,
    audioContext: AudioContext | null
}

class App extends React.Component<IAppProps, IAppState>
{
    private audioRef: React.RefObject<HTMLAudioElement>;

    constructor(props: IAppProps) {
        super(props);

        this.audioRef = React.createRef();
    }

    public componentDidMount()
    {
        if (!this.audioRef || !this.audioRef.current) {
            throw new Error("Expected an audio ref");
        }

        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();
        const audioNode = audioContext.createMediaElementSource(this.audioRef.current);

        // const gainNode = audioContext.createGain();
        // gainNode.gain.value = 2;
        // Create a compressor node
        const compressor = audioContext.createDynamicsCompressor();
        compressor.threshold.value = -50;
        compressor.knee.value = 40;
        compressor.ratio.value = 12;
        compressor.attack.value = 0;
        compressor.release.value = 0.25;
        // audioNode.disconnect(audioContext.destination);
        audioNode.connect(compressor).connect(audioContext.destination);

        this.setState({
            audioNode: audioNode,
            audioContext: audioContext
        });
    }

    public render() {
        return <>
            <h1>Compressor Visualizer</h1>

            {/* TODO: allow uploading */}
            <audio controls
                src="notrack/ryan.wav"
                ref={this.audioRef}>
                Your browser does not support the audio element :(.
            </audio>
            <button onClick={this.handlePlay}>Play Audio Context</button>
            <p>visualizer here</p>
            <p>(output here)</p>

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
        // if (!this.state.audioContext || !this.state.audioNode) {
        //     throw new Error("You need an audio context");
        // }

        // if (this.state.audioContext.state === "suspended") {
        //     this.state.audioContext.resume();
        // }

        // if (this.state.audioNode.)
    }
}

const app = document.getElementById("app");
ReactDOM.render(<App />, app);