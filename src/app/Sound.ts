class ElapsedTimer {
    private startTime: Date | null;
    private offsetMs: number = 0;

    constructor(offsetMs: number = 0) {
        this.startTime = new Date();
        this.offsetMs = offsetMs;
    }

    public getElapsedMs(): number {
        const runningMs = (this.startTime)
            ? (new Date()).getTime() - this.startTime.getTime()
            : 0;

        return runningMs + this.offsetMs;
    }

    public isPlaying(): boolean {
        return !!this.startTime;
    }

    public pause() {
        if (!this.startTime) {
            throw new Error("Cannot pause a paused timer");
        }

        const ms = (new Date()).getTime() - this.startTime.getTime();
        console.log("Pausing", ms, this.offsetMs);
        this.offsetMs += ms;

        this.startTime = null;
    }

    public resume() {
        if (this.startTime) {
            throw new Error("Cannot resume a running timer");
        }

        this.startTime = new Date();
    }
}

export default class Sound {
    readonly context: AudioContext;
    readonly buffer: AudioBuffer;

    private node: AudioBufferSourceNode | null = null;
    private timer: ElapsedTimer | null = null;
    private onStateChangeCallback: (() => void) | null = null;

    constructor(context: AudioContext, buffer: AudioBuffer) {
        this.context = context;
        this.buffer = buffer;
    }

    public onStateChange(callback: () => void) {
        this.onStateChangeCallback = callback;
    }

    public start(when: number = 0, offsetS: number = 0) {
        const bufferNode = this.context.createBufferSource();
        bufferNode.buffer = this.buffer;
        bufferNode.connect(this.context.destination);
        bufferNode.addEventListener("ended", this.handleEnded);
        bufferNode.start(when, offsetS);

        this.timer = new ElapsedTimer(offsetS * 1000);
        this.node = bufferNode;
        this.onStateChangeCallback?.();
    }

    public play() {
        const elapsedS = (this.timer?.getElapsedMs() || 0) / 1000;

        this.start(0, elapsedS);
    }

    public pause() {
        this.node?.removeEventListener("ended", this.handleEnded);
        this.node?.stop();
        this.timer?.pause();
        this.onStateChangeCallback?.();
    }

    public stop() {
        this.node?.removeEventListener("ended", this.handleEnded);
        this.node?.stop();
        this.node = null;
        this.timer = null;
        this.onStateChangeCallback?.();
    }

    public isPlaying(): boolean {
        return this.timer?.isPlaying() || false;
    }

    public getElapsedMs(): number {
        return this.timer?.getElapsedMs() || 0;
    }

    private handleEnded = () => {
        this.timer = null;
        this.onStateChangeCallback?.();
    }
}