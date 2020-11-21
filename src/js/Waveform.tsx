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
        const height = 300;
        return <svg width={width} height={height}>
            {this.props.numbers.map((wave) => {
                const stepWidth = Math.max(1, width / wave.length);
                return <polygon
                    color="black"
                    opacity={1 / this.props.numbers.length}
                    points={Array.from(wave).reduce<string>((acc, v, i) => {
                        // Create x,y pts for the wave:
                        const x = i * stepWidth;
                        const y = Math.abs(v) * height;
                        return acc + ` ${x},${y}`;
                    }, "0,0") + ` ${width},0`} />;
            })}
        </svg>;
    }
}