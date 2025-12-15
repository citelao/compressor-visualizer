import React from "react";
import ReactDOM from "react-dom";
import Db from "./Db";
import * as d3 from "d3";

interface IWaveformProps {
    numbers: Float32Array[];
    width: number;
    height?: number;
}

interface IWaveformState {
    hoverHeight: number;
    isHovered: boolean;
}

interface IWaveform2State {
    transform: d3.ZoomTransform;
}

const HEIGHT = 300;

export class Waveform2 extends React.Component<IWaveformProps, IWaveform2State> {
    private svgRef = React.createRef<SVGSVGElement>();
    private zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>;

    public constructor(props: IWaveformProps) {
        super(props);

        this.state = {
            transform: d3.zoomIdentity
        }

        this.zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 20])
            .filter((event) => {
                // Only allow zoom with shift+wheel, and pan with drag
                if (event.type === 'wheel') {
                    return event.shiftKey;
                }
                return event.type !== 'wheel';
            })
            .on('zoom', this.handleZoom);
    }

    public render() {
        const data = this.props.numbers[0];
        const height = this.props.height || HEIGHT;

        const margin = { top: 20, right: 20, bottom: 20, left: 20 };

        // Apply d3 transform to scales
        const x = this.state.transform.rescaleX(
            d3.scaleLinear([0, data.length], [margin.left, this.props.width - margin.right])
        );

        const y = d3.scaleLinear([-1, 1], [height - margin.bottom, margin.top]);

        const dataLine = d3.line<number>()
            .x((d, i) => x(i))
            .y((d) => y(d));

        const xTicks = x.ticks(10);
        const yTicks = y.ticks(5);

        return <svg
            ref={this.svgRef}
            width={this.props.width}
            height={height}
            style={{ cursor: 'grab' }}>

            {/* a nice background for the data, using the margin */}
            {/* <rect x={margin.left} y={margin.top}
                width={this.props.width - margin.left - margin.right}
                height={height - margin.top - margin.bottom}
                fill="lightgray" /> */}

            <g>
                <text x={10} y={10} dominantBaseline="middle">
                    Zoom: {this.state.transform.k.toFixed(2)}x | Pan: {this.state.transform.x.toFixed(0)}
                </text>
            </g>
            <g name="yTicks">
                {yTicks.map((tick) => (
                    <g key={tick}>
                        <line x1={margin.left} x2={this.props.width - margin.right}
                            y1={y(tick)} y2={y(tick)}
                            stroke="black" strokeOpacity={0.2} />
                        <text stroke="black" x={40} y={y(tick)} dominantBaseline="middle" textAnchor="end">{tick.toFixed(1)}</text>
                    </g>
                ))}
            </g>
            <g>
                <path d={dataLine(data)!}
                    fill="none" stroke="black" strokeWidth={1} />
            </g>
        </svg>;
    }

    public componentDidMount() {
        if (this.svgRef.current) {
            d3.select(this.svgRef.current).call(this.zoomBehavior);
        }
    }

    public componentWillUnmount() {
        if (this.svgRef.current) {
            d3.select(this.svgRef.current).on('.zoom', null);
        }
    }

    private handleZoom = (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        this.setState({
            transform: event.transform
        });
    }
}

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