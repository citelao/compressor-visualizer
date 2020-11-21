import React from "react";
import ReactDOM from "react-dom";

interface IWaveformProps {
    numbers: Float32Array[];
    width: number;
}

interface IWaveformState {
}

const HEIGHT = 300;

export default class Waveform extends React.Component<IWaveformProps, IWaveformState>
{
    public render() {
        const width = this.props.width;
        return <svg width={width} height={HEIGHT}>
            {this.props.numbers.map((wave) => {
                const stepWidth = Math.max(1, width / wave.length);
                return <polygon
                    color="black"
                    opacity={1 / this.props.numbers.length}
                    points={Array.from(wave).reduce<string>((acc, v, i) => {
                        // Create x,y pts for the wave:
                        const x = i * stepWidth;
                        const y = Waveform.linearToHeight(v);
                        return acc + ` ${x},${y}`;
                    }, `0,${Waveform.linearToHeight(0)}`) + ` ${width},${Waveform.linearToHeight(0)}`} />;
            })}
        </svg>;
    }

    private static linearToHeight(linearAudioValue: number): number {
        // return (HEIGHT / 2) - (linearAudioValue * (HEIGHT / 2));
        return (HEIGHT) - (Math.abs(linearAudioValue) * (HEIGHT));
    }
}