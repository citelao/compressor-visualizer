import React from "react";
import ReactDOM from "react-dom";

interface IWaveformProps {
    numbers: Float32Array;
}

interface IWaveformState {
}

export default class Waveform extends React.Component<IWaveformProps, IWaveformState>
{
    public render() {
        return <svg>
            {Array.from(this.props.numbers).map((v, i) => {
                const height = Math.abs(v) * 300;
                return <rect key={i} x={i} width={1} height={height} color="black" />;
            })}
        </svg>;
    }
}