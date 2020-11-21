export default class Db
{
    // https://www.w3.org/TR/webaudio/#compression-curve
    // https://www.w3.org/TR/webaudio/#computing-the-makeup-gain
    public static dbToLinear(decibel: number): number {
        return Math.pow(10, (decibel / 20));
    }
}