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

    // dBFS is Decibels relative to Full Scale; 0 dBFS is the maximum possible
    // level and negative values represent levels below the maximum.
    //
    // This is useful for visualizing waveforms: values of 1.0 and -1.0
    // correspond to 0 dBFS, while 0.0 corresponds to -Infinity dBFS.
    public static linearToDbfs(linear: number): number {
        // Dbfs is based on absolute value.
        const absLinear = Math.abs(linear);
        const db = Db.linearToDb(absLinear);

        // Special-case -1000 (min value)
        if (db === -1000) {
            return -Infinity;
        }

        return db;
    }
}