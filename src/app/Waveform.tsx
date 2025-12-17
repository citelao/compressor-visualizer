import React, { type JSX } from "react";
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

    sampledWaveform: MinMaxSampleResult[];
    lastUpdateDurationMs?: number;
}

const HEIGHT = 300;
const TOOMANY = 1000;

interface IWaveformPathProps {
    waveform: IIndependentWaveform;
    x: d3.ScaleLinear<number, number>;
    y: d3.ScaleLinear<number, number>;
}
function WaveformPath(props: IWaveformPathProps): JSX.Element {
    const sampledWaveform = React.useMemo(() => {
        console.log("Sampling waveform for WaveformPath...");
        return minMaxSample(props.waveform.numbers, TOOMANY);
    }, [props.waveform.numbers]);

    console.log("Rendering WaveformPath...");
    const areaGenerator = d3.area<number>()
        .x((i) => props.x(i))
        .y0((i) => props.y(sampledWaveform.min[i]!))
        .y1((i) => props.y(sampledWaveform.max[i]!));
    const dataRange = d3.range(sampledWaveform.max.length || 0);

    return <g>
        <path d={areaGenerator(dataRange)!}
            fill={props.waveform.color} opacity={0.3} stroke="none" />
    </g>;
}

export function Waveform2(props: IWaveformProps) {
    console.log("Rendering Waveform...");
    const stopwatch = performance.now();
    const height = props.height || HEIGHT;

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Standardized across audio.
    const y = d3.scaleLinear([-1, 1], [height - margin.bottom, margin.top]);

    // If the data lengths differ, throw.
    const xLength = props.waveforms[0].numbers.length;
    if (props.waveforms.some(w => w.numbers.length !== props.waveforms[0].numbers.length)) {
        throw new Error("All waveforms must have the same length");
    }

    const sampledXLength = Math.min(xLength, TOOMANY);
    
    // Apply d3 transform to scales
    // const x = this.state.transform.rescaleX(
    //     d3.scaleLinear([0, sampledXLength], [margin.left, props.width - margin.right])
    // );
    const x = d3.scaleLinear([0, sampledXLength], [margin.left, props.width - margin.right]);

    const yTicks = y.ticks(5);

    const viewWidthS = props.sampleRate ? xLength / props.sampleRate : undefined;

    // const hoverX = this.starte.hoverX;
    const hoverX = undefined;
    const hoveredPosition = hoverX !== undefined
        ? Math.floor(x.invert(hoverX))
        : undefined;
    const hoveredS = props.sampleRate && hoveredPosition !== undefined
        ? ` (${(hoveredPosition / props.sampleRate).toFixed(2)}s)`
        : undefined;

    const isValidHover = hoveredPosition !== undefined
        && hoveredPosition >= 0
        && hoveredPosition < sampledXLength;

    const hoveredPositions = props.waveforms.map(w => isValidHover ? w.numbers[hoveredPosition!] : undefined);

    const hoveredGroup = isValidHover
        ? <g>
            <text x={hoverX! + 10} y={10} dominantBaseline="middle" textAnchor="start">
                Sample {hoveredPosition}{hoveredS} : {hoveredPositions.map((val, index) => val?.toFixed(4) ?? "N/A").join(", ")}
            </text>
            <line x1={x(hoveredPosition)} x2={x(hoveredPosition)}
                y1={margin.top} y2={height - margin.bottom}
                stroke="black" strokeOpacity={0.5} />
            </g>
        : null;

    const lines = props.waveforms.map((waveform, index) => {
        // Trim the line if it's too long
        const numbersToUse = (waveform.numbers.length > TOOMANY)
            ? waveform.numbers.subarray(0, TOOMANY)
            : waveform.numbers;

        const lineGenerator = d3.line<number>()
            .x((d, i) => x(i))
            .y((d) => y(d));
        return <g key={index}>
            <path d={lineGenerator(numbersToUse)!}
                fill="none" stroke={waveform.color} opacity={0.5} strokeWidth={1} />
        </g>;
        // return <WaveformPath key={index} waveform={waveform} x={x} y={y} />;
    });

    const elapsed = performance.now() - stopwatch;
    console.log(`Waveform render time: ${elapsed.toFixed(2)}ms`);

    // ref={this.svgRef}
    // onMouseMove={this.handleMouseMove}
    // onMouseEnter={this.handleMouseEnter}
    // onMouseLeave={this.handleMouseLeave}
    return <svg
        width={props.width}
        height={height}
        style={{ cursor: 'grab' }}>

        {/* a nice background for the data, using the margin */}
        {/* <rect x={margin.left} y={margin.top}
            width={props.width - margin.left - margin.right}
            height={height - margin.top - margin.bottom}
            fill="lightgray" /> */}

        {hoveredGroup}

        <g>
            <text x={10} y={10} dominantBaseline="middle">
                {/* Zoom: {this.state.transform.k.toFixed(2)}x | Pan: {this.state.transform.x.toFixed(0)} | Samples: {xLength.toLocaleString()} (render time: {elapsed.toFixed(2)}ms; proc: {this.state.lastUpdateDurationMs?.toFixed(2)}ms) |  */}
                Duration: {viewWidthS?.toFixed(2)}s
                Render time: {elapsed.toFixed(2)}ms
            </text>
        </g>
        <g name="yTicks">
            {yTicks.map((tick) => (
                <g key={tick}>
                    <line x1={margin.left} x2={props.width - margin.right}
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

export default class Waveform extends React.Component<IWaveformProps, IWaveformState> {
    private svgRef = React.createRef<SVGSVGElement>();
    private zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>;

    private isHandlingMouseMove = false;

    public constructor(props: IWaveformProps) {
        super(props);

        this.state = {
            transform: d3.zoomIdentity,
            hoverX: undefined,
            sampledWaveform: [],
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
        console.log("Rendering Waveform...");
        const stopwatch = performance.now();
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
            // // Trim the line if it's too long
            // const numbersToUse = (waveform.numbers.length > TOOMANY)
            //     ? this.state.sampledWaveform?.max ?? new Float32Array(TOOMANY)
            //     : waveform.numbers;

            // const lineGenerator = d3.line<number>()
            //     .x((d, i) => x(i))
            //     .y((d) => y(d));
            // return <g key={index}>
            //     <path d={lineGenerator(numbersToUse)!}
            //         fill="none" stroke={waveform.color} opacity={0.5} strokeWidth={1} />
            // </g>;

            const areaGenerator = d3.area<number>()
                .x((i) => x(i))
                .y0((i) => y(this.state.sampledWaveform[index].min[i]!))
                .y1((i) => y(this.state.sampledWaveform[index].max[i]!));
            const dataRange = d3.range(this.state.sampledWaveform[index]?.max.length || 0);

            return <g key={index}>
                <path d={areaGenerator(dataRange)!}
                    fill={waveform.color} opacity={0.3} stroke="none" />
            </g>;
        });

        const elapsed = performance.now() - stopwatch;
        console.log(`Waveform render time: ${elapsed.toFixed(2)}ms`);

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
                    Zoom: {this.state.transform.k.toFixed(2)}x | Pan: {this.state.transform.x.toFixed(0)} | Samples: {xLength.toLocaleString()} (render time: {elapsed.toFixed(2)}ms; proc: {this.state.lastUpdateDurationMs?.toFixed(2)}ms) | Duration: {viewWidthS?.toFixed(2)}s
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

    // public componentDidMount() {
    //     const stopwatch = performance.now();
    //     this.updateZoomExtents();
    //     if (this.svgRef.current) {
    //         d3.select(this.svgRef.current).call(this.zoomBehavior);
    //     }

    //     const sampledWaveform = this.props.waveforms.map(waveform => minMaxSample(waveform.numbers, TOOMANY));
    //     this.setState({
    //         sampledWaveform,
    //         lastUpdateDurationMs: performance.now() - stopwatch,
    //     });
    // }

    // public componentDidUpdate(prevProps: IWaveformProps) {
    //     console.log("Waveform component did update...");
    //     const stopwatch = performance.now();

    //     // Update zoom extents if data length changed
    //     if (prevProps.waveforms[0]?.numbers.length !== this.props.waveforms[0]?.numbers.length) {
    //         this.updateZoomExtents();
    //     }

    //     const sampledWaveform = this.props.waveforms.map((waveform, index) => {
    //         console.log(`Checking waveform ${index} for changes...`);
    //         if (prevProps.waveforms[index]?.numbers !== waveform.numbers) {
    //             console.log(`Waveform ${index} data changed, updating appropriate waveform...`);
    //             const minMaxSampled = minMaxSample(waveform.numbers, TOOMANY);
    //             return minMaxSampled;
    //         }
    //         return null;
    //     });

    //     const didAnyChange = sampledWaveform.some(s => s !== null);
    //     if (didAnyChange) {
    //         const newSampledWaveform = this.state.sampledWaveform.slice();
    //         sampledWaveform.forEach((s, index) => {
    //             if (s !== null) {
    //                 newSampledWaveform[index] = s;
    //             }
    //         });
    //         // this.setState({
    //         //     sampledWaveform: newSampledWaveform,
    //         //     lastUpdateDurationMs: performance.now() - stopwatch,
    //         // });
    //     }
    //     // const didAnyChange = this.props.waveforms.some((waveform, index) => {
    //     //     return prevProps.waveforms[index]?.numbers !== waveform.numbers;
    //     // });
    //     // if (didAnyChange) {
    //     //     const sampledWaveform = this.props.waveforms.map(waveform => minMaxSample(waveform.numbers, TOOMANY));
    //     //     this.setState({
    //     //         sampledWaveform,
    //     //         lastUpdateDurationMs: performance.now() - stopwatch,
    //     //     });
    //     // }
    //     console.log("Component did update");
    // }

    // public componentWillUnmount() {
    //     if (this.svgRef.current) {
    //         d3.select(this.svgRef.current).on('.zoom', null);
    //     }
    // }

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