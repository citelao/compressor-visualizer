import React, { type JSX, type ReactSVGElement } from "react";
import * as d3 from "d3";
import type { ICompressorSettings } from "./Compressor";
import Compressor from "./Compressor";

interface IGraphProps {
    height: number,
    width: number

    fn: (x: number) => number,
    x1: number,
    x2: number,

    y1: number,
    y2: number
}

interface Point {
    x: number;
    y: number;
}

interface IPointLineProps {
    p1: Point,
    p2: Point
}
function PointLine(props: IPointLineProps & React.SVGProps<SVGLineElement>): JSX.Element {
    const {p1, p2, ...remaining} = props;
    return <line
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        {...remaining}
        />;
}

interface IGraph2Props {
    height: number,
    width: number,

    xRange: [number, number],
    yRange: [number, number],
    fn: (x: number) => number,

    title?: string
}

export class Graph2 extends React.Component<IGraph2Props> {
    public render() {
        const margin = { top: 20, right: 20, bottom: 20, left: 20 };

        const data: number[] = [];
        const sampleCount = this.props.width;
        const rangeX = (this.props.xRange[1] - this.props.xRange[0]);
        const offsetX = this.props.xRange[0];
        for (let i = 0; i < sampleCount; i++) {
            const elapsedPercent = i / sampleCount;
            const xVal = offsetX + (elapsedPercent * rangeX);
            const yVal = this.props.fn(xVal);
            data.push(yVal);
        }

        const x = d3.scaleLinear([0, data.length], [margin.left, this.props.width - margin.right]);
        const xInput = d3.scaleLinear([0, data.length], this.props.xRange);
        const y = d3.scaleLinear(this.props.yRange, [this.props.height - margin.bottom, margin.top]);
        // console.log(d3.extent(data));

        const dataLine = d3.line<number>()
            .x((d, i) => x(i))
            .y((d) => y(d));

        // Guarantee square ticks.
        const xTicks = d3.ticks(this.props.xRange[0], this.props.xRange[1], 5);
        const yTicks = d3.ticks(this.props.yRange[0], this.props.yRange[1], 5);
        // console.log(xTicks, yTicks);

        // Transform ticks back to input domain for proper placement
        const xTickPositions = xTicks.map(tick => {
            // Find the corresponding index in data for this tick
            const percent = (tick - this.props.xRange[0]) / rangeX;
            return percent * data.length;
        });

        return <svg height={this.props.height} width={this.props.width}>
            <g>
                {xTicks.map((tick, i) => (
                    <g key={i}>
                        <line x1={x(xTickPositions[i])} x2={x(xTickPositions[i])}
                            y1={margin.top} y2={this.props.height - margin.bottom}
                            stroke="black" strokeOpacity={0.2} />
                        <text stroke="black" x={x(xTickPositions[i])} y={this.props.height - margin.bottom} dominantBaseline="hanging" textAnchor="middle">{tick.toFixed(1)}</text>
                    </g>
                ))}
            </g>
            <g>
                {yTicks.map((tick, i) => (
                    <g key={i}>
                        <line x1={margin.left} x2={this.props.width - margin.right}
                            y1={y(tick)} y2={y(tick)}
                            stroke="black" strokeOpacity={0.2} />
                        <text stroke="black" x={margin.left + 5} y={y(tick)} dominantBaseline="middle" textAnchor="end">{tick.toFixed(1)}</text>
                    </g>
                ))}
            </g>
            <path
                stroke="black"
                fill="none"
                d={dataLine(data)!} />
            <text x={10} y={10} dominantBaseline="middle" textAnchor="start">
                {/* Samples: {data.length.toLocaleString()} |  */}{this.props.title}
            </text>
        </svg>;
    }
}

export interface ICompressorGraphProps {
    height: number,
    width: number,
    compressorSettings: ICompressorSettings
}

export class CompressorGraph extends React.Component<ICompressorGraphProps> {

    public render() {
        const margin = { top: 20, right: 20, bottom: 20, left: 20 };

        // Both axes scale from -100dB to 0dB
        const x = d3.scaleLinear([-100, 0], [margin.left, this.props.width - margin.right]);
        const y = d3.scaleLinear([-100, 0], [this.props.height - margin.bottom, margin.top]);
        const xTicks = x.ticks(5);
        const yTicks = y.ticks(5);

        // Key positions
        const threshold = this.props.compressorSettings.threshold;
        const kneeStartX = x(threshold);
        const kneeEnd = Compressor.calculateKneeEndDb(this.props.compressorSettings);
        const kneeEndX = x(kneeEnd);

        const data: number[] = [];
        const sampleCount = this.props.width;
        const dataToX = d3.scaleLinear([0, sampleCount], [-100, 0]);
        for (let i = 0; i < sampleCount; i++) {
            const inputDb = dataToX(i);
            const outputDb = Compressor.compressCurveDb(inputDb, this.props.compressorSettings);
            data.push(outputDb);
        }

        const dataLine = d3.line<number>()
            .x((d, i) => x(dataToX(i)))
            .y((d) => y(d));

        return <svg height={this.props.height} width={this.props.width}>
            <path
                stroke="blue"
                fill="none"
                d={dataLine(data)!} />
            <text x={10} y={10} dominantBaseline="middle" textAnchor="start">
                Compressor Curve (dB)
            </text>

            {/* Draw the key positions */}
            <g>
                <text x={kneeStartX} y={margin.top + 15} textAnchor="middle" fill="red">
                    Threshold ({threshold} dB)
                </text>
                <PointLine p1={{x: kneeStartX, y: margin.top}} p2={{x: kneeStartX, y: this.props.height - margin.bottom}}
                    stroke="red" strokeDasharray="4 2" />
            </g>
            <g>
                <text x={kneeEndX} y={margin.top + 35} textAnchor="middle" fill="blue">
                    Knee End ({kneeEnd} dB)
                </text>
                <PointLine p1={{x: kneeEndX, y: margin.top}} p2={{x: kneeEndX, y: this.props.height - margin.bottom}}
                    stroke="blue" strokeDasharray="4 2" />
            </g>

            {/* x axis */}
            <g>
                <line x1={margin.left} x2={this.props.width - margin.right}
                    y1={this.props.height - margin.bottom} y2={this.props.height - margin.bottom}
                    stroke="black" strokeOpacity={0.5} />
                {xTicks.map((tick, i) => (
                    <g key={i}>
                        <line x1={x(tick)} x2={x(tick)}
                            y1={this.props.height - margin.bottom} y2={this.props.height - margin.bottom + 5}
                            stroke="black" strokeOpacity={0.5} />
                        <text stroke="black" x={x(tick)} y={this.props.height - margin.bottom + 5} dominantBaseline="hanging" textAnchor="middle">{tick.toFixed(1)}</text>
                    </g>
                ))}
             </g>

            {/* y axis */}
            <g>
                <line x1={margin.left} x2={margin.left}
                    y1={margin.top} y2={this.props.height - margin.bottom}
                    stroke="black" strokeOpacity={0.5} />
                {yTicks.map((tick, i) => (
                    <g key={i}>
                        <line x1={margin.left - 5} x2={margin.left}
                            y1={y(tick)} y2={y(tick)}
                            stroke="black" strokeOpacity={0.5} />
                        <text stroke="black" x={margin.left + 5} y={y(tick)} dominantBaseline="middle" textAnchor="start">{tick.toFixed(1)}</text>
                    </g>
                ))}
            </g>
        </svg>;
    }
}