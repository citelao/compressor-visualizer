import React, { type ReactSVGElement } from "react";

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