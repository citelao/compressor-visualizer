import React from "react";
import ReactDOM from "react-dom";
import Db from "./Db";

interface IWaveformProps {
    numbers: Float32Array[];
    width: number;
}

interface IWaveformState {
    hoverHeight: number;
    isHovered: boolean;
}

const HEIGHT = 300;

export default class Waveform extends React.Component<IWaveformProps, IWaveformState>
{
    private isHandlingMouseMove = false;

    public constructor(props: IWaveformProps) {
        super(props);

        this.state = {
            hoverHeight: 0,
            isHovered: false
        }
    }

    public render() {
        const width = this.props.width;
        const SCALE_DB = [0, -10, -28, -90];
        // const SCALE_LINEAR_PTS = [0, 0.5, 1];
        
        return <svg width={width} height={HEIGHT}
            onMouseMove={this.handleMouseMove}
            onMouseEnter={this.handleMouseEnter}
            onMouseLeave={this.handleMouseLeave}>
            {/* Hover line */}
            {this.state.isHovered
                ? <g>
                    <text x={9} y={10} dominantBaseline="middle">{Db.linearToDb(Waveform.heightToLinear(this.state.hoverHeight))}db ({Waveform.heightToLinear(this.state.hoverHeight)})</text>
                    <line x1={0} x2={width} y1={this.state.hoverHeight} y2={this.state.hoverHeight} stroke="black" />
                </g>
                : null}

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
                const stepWidth = width / wave.length;
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

    private static heightToLinear(height: number): number {
        // TODO centered algorithm
        return (HEIGHT - height) / HEIGHT;
    }

    private handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
        if (!this.isHandlingMouseMove) {
            const target = e.currentTarget;
            requestAnimationFrame(() => {
                const svg = target as SVGSVGElement;
                this.setState({
                    hoverHeight: e.clientY - svg.getBoundingClientRect().top
                })
                this.isHandlingMouseMove = false;
            });
            this.isHandlingMouseMove = true;
        }
    }

    private handleMouseEnter = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
        this.setState({
            isHovered: true
        });
    }

    private handleMouseLeave = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
        this.setState({
            isHovered: false
        });
    }
}