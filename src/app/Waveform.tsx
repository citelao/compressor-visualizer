import React from "react";
import * as d3 from "d3";
import type { JSX } from "astro/jsx-runtime";

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
}

const HEIGHT = 300;

// Reimplement as function component to test performance difference
export function Waveform2(props: IWaveformProps): JSX.Element {
    const [transform, setTransform] = React.useState<d3.ZoomTransform>(d3.zoomIdentity);
    const [hoverX, setHoverX] = React.useState<number | undefined>(undefined);
    const [isHandlingMouseMove, setIsHandlingMouseMove] = React.useState(false);
    const svgRef = React.useRef<SVGSVGElement>(null);

    const zoomBehavior = React.useMemo(() => {
        return d3.zoom<SVGSVGElement, unknown>()
            .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
                setTransform(event.transform);
            });
    }, []);

    React.useEffect(() => {
        if (props.waveforms[0]) {
            const dataLength = props.waveforms[0].numbers.length;
            const margin = { top: 20, right: 20, bottom: 20, left: 20 };
            const plotWidth = props.width - margin.left - margin.right;
            const minZoom = 0.1;
            const pixelsPerSample = 2;
            const maxZoom = (dataLength * pixelsPerSample) / plotWidth;
            const clampedMaxZoom = Math.max(1, Math.min(maxZoom, 1000));
            zoomBehavior.scaleExtent([minZoom, clampedMaxZoom]);
        }
    }, [props.waveforms, props.width, zoomBehavior]);

    React.useEffect(() => {
        if (svgRef.current) {
            d3.select(svgRef.current).call(zoomBehavior);
        }
        return () => {
            if (svgRef.current) {
                d3.select(svgRef.current).on('.zoom', null);
            }
        };
    }, [zoomBehavior]);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
        if (!isHandlingMouseMove) {
            const target = e.currentTarget;
            requestAnimationFrame(() => {
                const rect = target.getBoundingClientRect();
                const x = e.clientX - rect.left;
                setHoverX(x);
                setIsHandlingMouseMove(false);
            });
            setIsHandlingMouseMove(true);
        }
    };

    const handleMouseEnter = () => {
        setIsHandlingMouseMove(true);
    };

    const handleMouseLeave = () => {
        setIsHandlingMouseMove(false);
        setHoverX(undefined);
    };

    const height = props.height || HEIGHT;

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Standardized across audio.
    const y = d3.scaleLinear([-1, 1], [height - margin.bottom, margin.top]);

    // If the data lengths differ, throw.
    const xLength = props.waveforms[0].numbers.length;
    if (props.waveforms.some(w => w.numbers.length !== props.waveforms[0].numbers.length)) {
        throw new Error("All waveforms must have the same length");
    }

    // Apply d3 transform to scales
    const x = transform.rescaleX(
        d3.scaleLinear([0, xLength], [margin.left, props.width - margin.right])
    );

    const yTicks = y.ticks(5);

    const viewWidthS = props.sampleRate ? xLength / props.sampleRate : undefined;

    const hoveredPosition = hoverX !== undefined
        ? Math.floor(x.invert(hoverX))
        : undefined;
    const hoveredS = props.sampleRate && hoveredPosition !== undefined
        ? ` (${(hoveredPosition / props.sampleRate).toFixed(2)}s)`
        : undefined;

    const isValidHover = hoveredPosition !== undefined
        && hoveredPosition >= 0
        && hoveredPosition < xLength;

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
        const lineGenerator = d3.line<number>()
            .x((d, i) => x(i))
            .y((d) => y(d));
        return <g key={index}>
            <path d={lineGenerator(waveform.numbers)!}
                fill="none" stroke={waveform.color} opacity={0.5} strokeWidth={1} />
        </g>;
    });

    return <svg
        ref={svgRef}
        width={props.width}
        height={height}
        style={{ cursor: 'grab' }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}>

        {/* a nice background for the data, using the margin */}
        {/* <rect x={margin.left} y={margin.top}
            width={props.width - margin.left - margin.right}
            height={height - margin.top - margin.bottom}
            fill="lightgray" /> */}

        {hoveredGroup}

        <g>
            <text x={10} y={10} dominantBaseline="middle">
                Zoom: {transform.k.toFixed(2)}x | Pan: {transform.x.toFixed(0)} | Samples: {xLength.toLocaleString()} | Duration: {viewWidthS?.toFixed(2)}s
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
            hoverX: undefined
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

        // Apply d3 transform to scales
        const x = this.state.transform.rescaleX(
            d3.scaleLinear([0, xLength], [margin.left, this.props.width - margin.right])
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
            && hoveredPosition < xLength;

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
            const lineGenerator = d3.line<number>()
                .x((d, i) => x(i))
                .y((d) => y(d));
            return <g key={index}>
                <path d={lineGenerator(waveform.numbers)!}
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
    }

    public componentDidUpdate(prevProps: IWaveformProps) {
        // Update zoom extents if data length changed
        if (prevProps.waveforms[0]?.numbers.length !== this.props.waveforms[0]?.numbers.length) {
            this.updateZoomExtents();
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
            const maxZoom = (dataLength * pixelsPerSample) / plotWidth;

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