export default class Timer {
    private startTime: Date;

    constructor() {
        this.startTime = new Date();
    }

    public stop(): number {
        const ms = (new Date()).getTime() - this.startTime.getTime();

        return ms;
    }
}