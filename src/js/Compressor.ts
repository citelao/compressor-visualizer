import Db from "./Db";

export interface ICompressorSettings {
    threshold: number,
    ratio: number,
    knee: number,
    attack: number,
    release: number,
}

export default class Compressor {
    public static compressDb(db: number, compressor: ICompressorSettings): number {
        return Compressor.compressLinear(Db.dbToLinear(db), compressor);
    }

    public static compressLinear(linearValue: number, compressor: ICompressorSettings): number {
        // TODO
        const linearThreshold = Db.dbToLinear(compressor.threshold);
        const linearKneeEnd =  Db.dbToLinear(compressor.threshold + compressor.knee);
        console.log(`threshold: ${linearThreshold}; knee end: ${linearKneeEnd}`)
        if (linearValue < linearThreshold) {
            return linearValue;
        } else if (linearValue < linearKneeEnd) {
            // User-agent dependent
            // TODO
            return linearValue;
        } else {
            return (1 / compressor.ratio) * linearValue;
        }
    }
}