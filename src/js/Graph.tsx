import React from "react";

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
        console.log(pts);

        const origin = this.truePointToDrawPoint({ x: 0, y: 0 });
        const xTop = this.truePointToDrawPoint({ x: 0, y: this.props.y2 });
        const yTop = this.truePointToDrawPoint({ x: this.props.x2, y: 0 });

        return <svg height={this.props.height} width={this.props.width}>
            {/* Grid */}
            <line x1={origin.x} x2={xTop.x} y1={origin.y} y2={xTop.y} stroke="black" opacity="0.2" />
            <line x1={origin.x} x2={yTop.x} y1={origin.y} y2={yTop.y} stroke="black" opacity="0.2" />

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