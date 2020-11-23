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

export default class Graph extends React.Component<IGraphProps> {
    public render() {
        const sampleCount = this.props.width;
        const rangeX = (this.props.x2 - this.props.x1);
        const offsetX = this.props.x1;
        const rangeY = (this.props.y2 - this.props.y1);
        const offsetY = this.props.y1;
        const pts = [];
        for (let i = 0; i < sampleCount; i++) {
            const stepWidth = this.props.width / sampleCount;
            const xPos = i * stepWidth;

            const elapsedPercent = i / sampleCount;
            const x = offsetX + (elapsedPercent * rangeX);
            const y = this.props.fn(x);
            console.log(x, y);
            const yPercentage = (y - offsetY) / rangeY;
            const yPos = yPercentage * this.props.height;

            pts.push({ x: xPos, y: yPos});
        }

        return <svg height={this.props.height} width={this.props.width}>
            {/* Grid */}
            <line x1={0} x2={this.props.width} y1={this.props.height} y2={this.props.height} stroke="black" />
            <line x1={0} x2={0} y1={0} y2={this.props.height} stroke="black" />

            <polyline
                stroke="black"
                fill="none"
                points={pts.map((pt) => `${pt.x},${pt.y}`).join(" ")} />
        </svg>
    }
}