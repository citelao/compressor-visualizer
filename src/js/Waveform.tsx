import React from "react";
import ReactDOM from "react-dom";

interface IWaveformProps {
    numbers: number[];
}

interface IWaveformState {
}

export default class Waveform extends React.Component<IWaveformProps, IWaveformState>
{
    public render() {
        return <svg>
            {this.props.numbers.map((v, i) => {
                return <rect x={i} width={1} height={v} color="black" />;
            })}
        </svg>;
    }
}