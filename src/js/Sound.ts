class ElapsedTimer {
    private startTime: Date | null;
    private offsetMs: number = 0;

    constructor() {
        this.startTime = new Date();
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

    constructor(context: AudioContext, buffer: AudioBuffer) {
        this.context = context;
        this.buffer = buffer;
    }

    public start() {
        const bufferNode = this.context.createBufferSource();
        bufferNode.buffer = this.buffer;
        bufferNode.connect(this.context.destination);

        if (this.node) {
            bufferNode.start(0, (this.timer?.getElapsedMs() || 0) / 1000);
            this.timer?.resume();
        } else {
            bufferNode.start();
            this.timer = new ElapsedTimer();
        }

        this.node = bufferNode;
    }

    public pause() {
        this.node?.stop();
        this.timer?.pause();
    }

    public stop() {
        this.node?.stop();
        this.node = null;
        this.timer = null;
    }

    public isPlaying(): boolean {
        return this.timer?.isPlaying() || false;
    }

    public getElapsedMs(): number {
        return this.timer?.getElapsedMs() || 0;
    }
}