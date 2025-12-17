import React from "react";
import * as d3 from "d3";
import { absMaxSample, minMaxSample, type MinMaxSampleResult } from "./Sampler";

interface IIndependentWaveform {
    numbers: Float32Array;
    color: string;
}

interface IWaveformProps {
    waveforms: IIndependentWaveform[];
    sampleRate?: number;
    width: number;
    height?: number;
}

interface IWaveformState {
    transform: d3.ZoomTransform;
    hoverX: number | undefined;

    sampledWaveform?: MinMaxSampleResult;
}

const HEIGHT = 300;
const TOOMANY = 1000;

export default class Waveform extends React.Component<IWaveformProps, IWaveformState> {
    private svgRef = React.createRef<SVGSVGElement>();
    private zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>;

    private isHandlingMouseMove = false;

    public constructor(props: IWaveformProps) {
        super(props);

        this.state = {
            transform: d3.zoomIdentity,
            hoverX: undefined,
            sampledWaveform: undefined,
        }

        this.zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
            // .filter((event) => {
            //     // Only allow zoom with shift+wheel, and pan with drag
            //     if (event.type === 'wheel') {
            //         return event.shiftKey;
            //     }
            //     return event.type !== 'wheel';
            // })
            .on('zoom', this.handleZoom);
    }

    public render() {
        const height = this.props.height || HEIGHT;
        
        const margin = { top: 20, right: 20, bottom: 20, left: 20 };

        // Standardized across audio.
        const y = d3.scaleLinear([-1, 1], [height - margin.bottom, margin.top]);

        // If the data lengths differ, throw.
        const xLength = this.props.waveforms[0].numbers.length;
        if (this.props.waveforms.some(w => w.numbers.length !== this.props.waveforms[0].numbers.length)) {
            throw new Error("All waveforms must have the same length");
        }

        const sampledXLength = Math.min(xLength, TOOMANY);
        
        // Apply d3 transform to scales
        const x = this.state.transform.rescaleX(
            d3.scaleLinear([0, sampledXLength], [margin.left, this.props.width - margin.right])
        );

        const yTicks = y.ticks(5);

        const viewWidthS = this.props.sampleRate ? xLength / this.props.sampleRate : undefined;

        const hoveredPosition = this.state.hoverX !== undefined
            ? Math.floor(x.invert(this.state.hoverX))
            : undefined;
        const hoveredS = this.props.sampleRate && hoveredPosition !== undefined
            ? ` (${(hoveredPosition / this.props.sampleRate).toFixed(2)}s)`
            : undefined;

        const isValidHover = hoveredPosition !== undefined
            && hoveredPosition >= 0
            && hoveredPosition < sampledXLength;

        const hoveredPositions = this.props.waveforms.map(w => isValidHover ? w.numbers[hoveredPosition!] : undefined);

        const hoveredGroup = isValidHover
            ? <g>
                <text x={this.state.hoverX! + 10} y={10} dominantBaseline="middle" textAnchor="start">
                    Sample {hoveredPosition}{hoveredS} : {hoveredPositions.map((val, index) => val?.toFixed(4) ?? "N/A").join(", ")}
                </text>
                <line x1={x(hoveredPosition)} x2={x(hoveredPosition)}
                    y1={margin.top} y2={height - margin.bottom}
                    stroke="black" strokeOpacity={0.5} />
             </g>
            : null;

        const lines = this.props.waveforms.map((waveform, index) => {
            // Trim the line if it's too long
            const numbersToUse = (waveform.numbers.length > TOOMANY)
                ? this.state.sampledWaveform?.max ?? new Float32Array(TOOMANY)
                : waveform.numbers;

            const lineGenerator = d3.line<number>()
                .x((d, i) => x(i))
                .y((d) => y(d));
            return <g key={index}>
                <path d={lineGenerator(numbersToUse)!}
                    fill="none" stroke={waveform.color} opacity={0.5} strokeWidth={1} />
            </g>;
        });

        return <svg
            ref={this.svgRef}
            width={this.props.width}
            height={height}
            style={{ cursor: 'grab' }}
            onMouseMove={this.handleMouseMove}
            onMouseEnter={this.handleMouseEnter}
            onMouseLeave={this.handleMouseLeave}>

            {/* a nice background for the data, using the margin */}
            {/* <rect x={margin.left} y={margin.top}
                width={this.props.width - margin.left - margin.right}
                height={height - margin.top - margin.bottom}
                fill="lightgray" /> */}

            {hoveredGroup}

            <g>
                <text x={10} y={10} dominantBaseline="middle">
                    Zoom: {this.state.transform.k.toFixed(2)}x | Pan: {this.state.transform.x.toFixed(0)} | Samples: {xLength.toLocaleString()} | Duration: {viewWidthS?.toFixed(2)}s
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
                {lines}
            </g>
        </svg>;
    }

    public componentDidMount() {
        this.updateZoomExtents();
        if (this.svgRef.current) {
            d3.select(this.svgRef.current).call(this.zoomBehavior);
        }

        const sampledWaveform = minMaxSample(this.props.waveforms[0].numbers, 1000);
        this.setState({
            sampledWaveform
        });
    }

    public componentDidUpdate(prevProps: IWaveformProps) {
        // Update zoom extents if data length changed
        if (prevProps.waveforms[0]?.numbers.length !== this.props.waveforms[0]?.numbers.length) {
            this.updateZoomExtents();
        }

        if (prevProps.waveforms[0]?.numbers !== this.props.waveforms[0]?.numbers) {
            const sampledWaveform = minMaxSample(this.props.waveforms[0].numbers, 1000);
            this.setState({
                sampledWaveform
            });
        }
    }

    public componentWillUnmount() {
        if (this.svgRef.current) {
            d3.select(this.svgRef.current).on('.zoom', null);
        }
    }

    private updateZoomExtents() {
        if (this.props.waveforms[0]) {
            const dataLength = this.props.waveforms[0].numbers.length;
            const margin = { top: 20, right: 20, bottom: 20, left: 20 };
            const plotWidth = this.props.width - margin.left - margin.right;

            // Minimum zoom: show entire waveform (with some padding)
            const minZoom = 0.1;

            // Maximum zoom: allow at least 2 pixels per sample for clear individual sample visibility
            // This means each sample will be at least 2 pixels wide when fully zoomed in
            const pixelsPerSample = 2;
            // const maxZoom = (dataLength * pixelsPerSample) / plotWidth;
            const maxZoom = TOOMANY;

            // Ensure maxZoom is at least 1 and reasonable upper bound
            const clampedMaxZoom = Math.max(1, Math.min(maxZoom, 1000));

            this.zoomBehavior.scaleExtent([minZoom, clampedMaxZoom]);
        }
    }

    private handleZoom = (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        this.setState({
            transform: event.transform
        });
    }

    private handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
        if (!this.isHandlingMouseMove) {
            const target = e.currentTarget;
            requestAnimationFrame(() => {
                const svg = target as SVGSVGElement;
                this.setState({
                    hoverX: e.clientX - svg.getBoundingClientRect().left
                })
                this.isHandlingMouseMove = false;
            });
            this.isHandlingMouseMove = true;
        }
    }

    private handleMouseEnter = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
        // this.setState({
        //     hoverX:
        // });
    }

    private handleMouseLeave = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
        requestAnimationFrame(() => {
            this.setState({
                hoverX: undefined
            });
        });
    }
}