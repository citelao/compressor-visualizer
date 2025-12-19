import React from "react";
import * as d3 from "d3";
import type { JSX } from "astro/jsx-runtime";
import type { ICompressorSettings } from "./Compressor";
import Db from "./Db";
import { absMaxSample, minMaxSample, type MinMaxSample } from "./samples";

interface IIndependentWaveform {
    numbers: Float32Array;
    color: string;
}

interface IWaveformProps {
    waveforms: IIndependentWaveform[];
    compressorSettings?: ICompressorSettings;
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

    const xStart = Math.max(0, x.invert(margin.left));
    const xEnd = Math.min(xLength, x.invert(props.width - margin.right));
    const visibleSamples = xEnd - xStart;
    // console.log(`xStart: ${xStart}; xEnd: ${xEnd}`, x.domain(), x.range(), x(0), x(xStart), x(xEnd), xLength);

    const simplifiedAreaCount = props.width;
    const [simplifiedWaves, setSimplifiedWaves] = React.useState<MinMaxSample[] | null>(null);
    React.useEffect(() => {
        let ignoreThis = false;
        const sampleFn = async () => {
            // TODO: only recalculate individual waveforms.
            console.time("Recalculating simplified area");
            const simplifiedWaves = props.waveforms.map((waveform) => {
                // Make an area based on simplified data
                const sample = minMaxSample(waveform.numbers, simplifiedAreaCount);
                console.log("Simplified waveform:", sample);
                return sample;

            });

            if (!ignoreThis) {
                setSimplifiedWaves(simplifiedWaves);
            }

            console.timeEnd("Recalculating simplified area");
        }
        sampleFn();

        return () => {
            ignoreThis = true;
        };
    }, [props.waveforms]);

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
            <text x={hoverX! + 10} y={10} dominantBaseline="middle" textAnchor="start" fill="blue">
                Sample {hoveredPosition}{hoveredS} : {hoveredPositions.map((val, index) => val?.toFixed(4) ?? "N/A").join(", ")}
            </text>
            <line x1={x(hoveredPosition)} x2={x(hoveredPosition)}
                y1={margin.top} y2={height - margin.bottom}
                stroke="black" strokeOpacity={0.5} />
            </g>
        : null;

    const MAX_RENDERED_SAMPLES = 50000;
    const lines = props.waveforms.map((waveform, index) => {
        // Only show when zoomed in enough.
        if (visibleSamples > MAX_RENDERED_SAMPLES) {
            return null;
        }

        const lineGenerator = d3.line<number>()
            .x((d, i) => x(i + xStart))
            .y((d) => y(d));
        return <g key={index}>
            <path d={lineGenerator(waveform.numbers.subarray(xStart, xEnd))!}
                fill="none" stroke={waveform.color} opacity={0.5} strokeWidth={1} />
        </g>;
    });

    const waves = simplifiedWaves !== null ? simplifiedWaves.map((wave, index) => {
        // This is an area designed to show a simplified waveform when zoomed out.
        const simplifiedArea = d3.area<number>()
            .x((d, i) => x(i * (xLength / simplifiedAreaCount)))
            .y0((d, i) => y(wave.mins[i]))
            .y1((d, i) => y(wave.maxs[i]));

        return <path key={index} d={simplifiedArea(d3.range(wave.mins.length))!}
            fillOpacity={0.2} stroke={props.waveforms[index]?.color} fill={props.waveforms[index]?.color} strokeWidth={1} />;
    }) : null;

    let compressorSettings: JSX.Element | null = null;
    if (props.compressorSettings) {
        const linearThreshold = Db.dbToLinear(props.compressorSettings.threshold);

        compressorSettings = <g name="compressorSettings">
            {/* Draw threshold line */}
            <line x1={margin.left} x2={props.width - margin.right}
                y1={y(linearThreshold)} y2={y(linearThreshold)}
                stroke="rebeccapurple" strokeOpacity={0.8} />
            <text x={props.width - margin.right - 10} y={y(linearThreshold)} dominantBaseline="middle" textAnchor="end" fill="rebeccapurple">
                Thresh {props.compressorSettings.threshold} dB
            </text>
        </g>;
    }

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
            <text x={10} y={10} dominantBaseline="middle" fillOpacity={0.2}>
                Zoom: {transform.k.toFixed(2)}x | Pan: {transform.x.toFixed(0)} | Samples: {xLength.toLocaleString()} | Duration: {viewWidthS?.toFixed(2)}s
            </text>
        </g>
        <g name="yTicks">
            {yTicks.map((tick) => (
                <g key={tick}>
                    <line x1={margin.left} x2={props.width - margin.right}
                        y1={y(tick)} y2={y(tick)}
                        stroke="black" strokeOpacity={0.2} />

                    {/* Draw tick text */}
                    <text stroke="black" x={props.width - margin.right - 5} y={y(tick)} dominantBaseline="middle" textAnchor="end">
                        <tspan opacity={0.7}>{tick.toFixed(1)}</tspan>
                    </text>
                </g>
            ))}
        </g>
        <g name="graphs">
            {/* TODO: only show when zoomed in */}
            {lines}
        </g>
        <g name="simplifiedWaves">
            {waves}
        </g>

        {compressorSettings}

        {/* Debug: draw start & end lines */}
        <g name="startEndLines">
            <line x1={x(xStart)} x2={x(xStart)}
                y1={margin.top} y2={height - margin.bottom}
                stroke="red" strokeOpacity={0.5} />
            <line x1={x(xEnd)} x2={x(xEnd)}
                y1={margin.top} y2={height - margin.bottom}
                stroke="red" strokeOpacity={0.5} />
        </g>

        {/* Debug: draw data start & end lines */}
        <g name="dataStartEndLines">
            <line x1={x(0)} x2={x(0)}
                y1={margin.top} y2={height - margin.bottom}
                stroke="green" strokeOpacity={0.5} />
            <line x1={x(xLength)} x2={x(xLength)}
                y1={margin.top} y2={height - margin.bottom}
                stroke="green" strokeOpacity={0.5} />
        </g>
    </svg>;
}