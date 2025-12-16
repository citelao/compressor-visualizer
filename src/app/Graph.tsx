import React, { type JSX, type ReactSVGElement } from "react";
import * as d3 from "d3";

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
        console.log(xTicks, yTicks);

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
                        <text stroke="black" x={margin.left} y={y(tick)} dominantBaseline="middle" textAnchor="end">{tick.toFixed(1)}</text>
                    </g>
                ))}
            </g>
            <path
                stroke="black"
                fill="none"
                d={dataLine(data)!} />
            <text x={10} y={10} dominantBaseline="middle" textAnchor="start">
                Samples: {data.length.toLocaleString()}
            </text>
        </svg>;
    }
}

export default class Graph extends React.Component<IGraphProps> {
    public render() {
        const sampleCount = this.props.width;
        const rangeX = (this.props.x2 - this.props.x1);
        const offsetX = this.props.x1;
        const pts = [];
        for (let i = 0; i < sampleCount; i++) {
            const elapsedPercent = i / sampleCount;
            const x = offsetX + (elapsedPercent * rangeX);
            const y = this.props.fn(x);
            pts.push(this.truePointToDrawPoint({ x, y }));
        }
        // console.log(pts);

        // const origin = this.truePointToDrawPoint({ x: 0, y: 0 });
        const xOrigin = [
            this.truePointToDrawPoint({ x: 0, y: this.props.y1 }),
            this.truePointToDrawPoint({ x: 0, y: this.props.y2 })
        ];
        const yOrigin = [
            this.truePointToDrawPoint({ x: this.props.x1, y: 0 }),
            this.truePointToDrawPoint({ x: this.props.x2, y: 0 })
        ];

        return <svg height={this.props.height} width={this.props.width}>
            {/* Grid */}
            <PointLine p1={xOrigin[0]} p2={xOrigin[1]} stroke="black" opacity="0.2" />
            <PointLine p1={yOrigin[0]} p2={yOrigin[1]} stroke="black" opacity="0.2" />

            <polyline
                stroke="black"
                fill="none"
                points={pts.map((pt) => `${pt.x},${pt.y}`).join(" ")} />
        </svg>
    }

    private truePointToDrawPoint(pt: Point): Point {
        const rangeX = (this.props.x2 - this.props.x1);
        const offsetX = this.props.x1;
        const rangeY = (this.props.y2 - this.props.y1);
        const offsetY = this.props.y1;

        const unoffsetPt: Point = { x: pt.x - offsetX, y: pt.y - offsetY };
        const percentagePt: Point = {
            x: unoffsetPt.x / rangeX,
            y: unoffsetPt.y / rangeY
        };

        return {
            x: percentagePt.x * this.props.width,
            y: this.props.height - (percentagePt.y * this.props.height)
        };
    }
}