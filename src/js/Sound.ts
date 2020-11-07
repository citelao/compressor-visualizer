export default class Sound {
    readonly context: AudioContext;
    readonly buffer: AudioBuffer;

    private node: AudioBufferSourceNode | null = null;

    constructor(context: AudioContext, buffer: AudioBuffer) {
        this.context = context;
        this.buffer = buffer;
    }

    public start() {
        const bufferNode = this.context.createBufferSource();
        bufferNode.buffer = this.buffer;
        bufferNode.connect(this.context.destination);

        if (this.node) {
            this.node.stop();
        }
        bufferNode.start();
        this.node = bufferNode;
    }

    public stop() {
        this.node?.stop();
        this.node = null;
    }

    public isPlaying(): boolean {
        return !!this.node;
    }
}