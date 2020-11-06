import React from "react";
import ReactDOM from "react-dom";

interface IWaveformProps {
    numbers: Float32Array[];
}

interface IWaveformState {
}

export default class Waveform extends React.Component<IWaveformProps, IWaveformState>
{
    public render() {
        return <svg>
            {this.props.numbers.map((wavePts) => {
                return Array.from(wavePts).map((v, i) => {
                    const height = Math.abs(v) * 300;
                    return <rect key={i} x={i} width={1} height={height} opacity={1 / this.props.numbers.length} color="black" />;
                });
            })}
        </svg>;
    }
}