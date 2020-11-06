import React from "react";
import ReactDOM from "react-dom";

interface IWaveformProps {
    numbers: Float32Array[];
    width: number;
}

interface IWaveformState {
}

export default class Waveform extends React.Component<IWaveformProps, IWaveformState>
{
    public render() {
        const width = this.props.width;
        return <svg width={width}>
            {this.props.numbers.map((wavePts) => {
                const rectWidth = Math.max(1, width / wavePts.length);
                return Array.from(wavePts).map((v, i) => {
                    const height = Math.abs(v) * 300;
                    return <rect key={i} x={i * rectWidth} width={rectWidth} height={height} opacity={1 / this.props.numbers.length} color="black" />;
                });
            })}
        </svg>;
    }
}