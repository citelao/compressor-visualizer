import React from "react";
import ReactDOM from "react-dom";
import Db from "./Db";

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
        const SCALE_DB = [0, -10, -28, -90];
        // const SCALE_LINEAR_PTS = [0, 0.5, 1];
        
        return <svg width={width} height={HEIGHT}>
            {/* Scale */}
            {SCALE_DB.map((db) => {
                const linear = Db.dbToLinear(db);
                const y = Waveform.linearToHeight(linear);
                // console.log(`Db: ${db} => ${linear} => ${y}px`);
                return <g key={db}>
                    <line x1={0} x2={5} y1={y} y2={y} stroke="black" />
                    <text x={9} y={y} dominantBaseline="middle">{db}db</text>
                </g>;
            })}

            {/* Waveform */}
            {this.props.numbers.map((wave, i) => {
                const stepWidth = Math.max(1, width / wave.length);
                return <polygon
                    key={i}
                    color="black"
                    opacity={1 / this.props.numbers.length}
                    points={Array.from(wave).reduce<string>((acc, v, j) => {
                        // Create x,y pts for the wave:
                        const x = j * stepWidth;
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