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

    // https://www.w3.org/TR/webaudio/#compression-curve
    public static compressLinear(linearValue: number, compressor: ICompressorSettings): number {
        const linearThreshold = Db.dbToLinear(compressor.threshold);
        const linearKneeEnd = Db.dbToLinear(compressor.threshold + compressor.knee);
        // console.log(`threshold: ${linearThreshold}; knee end: ${linearKneeEnd}`);
        if (linearValue < linearThreshold) {
            return linearValue;
        } else if (linearValue < linearKneeEnd) {
            // User-agent dependent
            //
            // TODO: our knee settings default to 0 to make this a non-issue for
            // now :)
            return linearValue;
        } else {
            // Note: this diverges from the spec for the compression curve
            // (https://www.w3.org/TR/webaudio/#compression-curve). The spec
            // simply specifies linearity, but does not specify continuity.
            // However, in practice, this function is continuous
            // (https://source.chromium.org/chromium/chromium/src/+/master:third_party/blink/renderer/platform/audio/dynamics_compressor_kernel.cc;l=117;bpv=1;bpt=1),
            // so follow the Chromium model and apply the ration "after" the
            // threshold limit.
            //
            // TODO: should this knee be done on the linear value or the the dB
            // value?
            return linearKneeEnd + ((1 / compressor.ratio) * (linearValue - linearKneeEnd));
        }
    }
}