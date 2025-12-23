// Manual types from inspecting Needles directly.
// https://github.com/domchristie/needles
declare module '@domchristie/needles' {
    interface ILoudnessMeterOptions {
        source: AudioBufferSourceNode;
        modes?: Array<"momentary" | "short-term" | "integrated">;
        workerUri: string;
        workletUri?: string;
    }

    interface IDataAvailableEvent {
        data: {
            // Value in LUFS
            value: number;
            mode: "momentary" | "short-term" | "integrated";
        }
    }

    export class LoudnessMeter {
        constructor(options: ILoudnessMeterOptions);

        on(event: 'dataavailable', listener: (event: IDataAvailableEvent) => void): void;
        off(event: 'dataavailable', listener: (event: IDataAvailableEvent) => void): void;

        start(): void;
        pause(): void;
        resume(): void;
        reset(): void;
        stop(): void;
    }
}