export default class Db
{
    // https://www.w3.org/TR/webaudio/#compression-curve
    // https://www.w3.org/TR/webaudio/#computing-the-makeup-gain
    public static dbToLinear(decibel: number): number {
        return Math.pow(10, (decibel / 20));
    }

    public static linearToDb(linear: number): number {
        const log10 = Math.log10(linear);
        return 20 * log10;
    }
}