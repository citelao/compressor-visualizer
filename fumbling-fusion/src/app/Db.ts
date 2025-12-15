export default class Db
{
    // https://www.w3.org/TR/webaudio/#computing-the-makeup-gain
    // https://www.w3.org/TR/webaudio/#decibels-to-linear-gain-unit
    public static dbToLinear(decibel: number): number {
        return Math.pow(10, (decibel / 20));
    }

    // https://www.w3.org/TR/webaudio/#linear-to-decibel
    public static linearToDb(linear: number): number {
        if (linear == 0) {
            return -1000;
        }

        const log10 = Math.log10(linear);
        return 20 * log10;
    }
}