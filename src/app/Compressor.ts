import Db from "./Db";

export interface ICompressorSettings {
    threshold: number,
    ratio: number,
    knee: number,
    attack: number,
    release: number,
}

export default class Compressor {

    // Apply compression to a dB value (result in dB).
    public static compressCurveDb(db: number, compressor: ICompressorSettings): number {
        return Db.linearToDb(Compressor.compressCurveLinear(Db.dbToLinear(db), compressor));
    }

    // Applies compression to a linear value (e.g. the raw number between -1 and
    // 1 you get from an AudioBuffer channel)
    //
    // https://www.w3.org/TR/webaudio/#compression-curve
    public static compressCurveLinear(linearValue: number, compressor: ICompressorSettings): number {
        const linearThreshold = Db.dbToLinear(compressor.threshold);
        const linearKneeEnd = Db.dbToLinear(Compressor.calculateKneeEndDb(compressor));
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
            // (https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/platform/audio/dynamics_compressor.cc;l=513;drc=7666bc1983c2a5b98e5dc6fa6c28f8f53c07d06f?q=dynamics&ss=chromium%2Fchromium%2Fsrc),
            // so follow the Chromium model and apply the ration "after" the
            // threshold limit.
            //
            // The ratio should be applied to the *decibel* value, not the
            // linear value, so we convert back and forth here.
            const inputDb = Db.linearToDb(linearValue);
            const outputDb = Db.linearToDb(linearKneeEnd) + ((1 / compressor.ratio) * (inputDb - Db.linearToDb(linearKneeEnd)));
            return Db.dbToLinear(outputDb);
        }
    }

    // Calculates the dB value that marks the end of the knee region
    public static calculateKneeEndDb(compressor: ICompressorSettings): number {
        return compressor.threshold + compressor.knee;
    }

    // Full range gain is the maximum compression (e.g. for a 0dB input). This
    // returns linear units.
    //
    // https://webaudio.github.io/web-audio-api/#computing-the-makeup-gain
    public static fullRangeGainLinear(compressor: ICompressorSettings): number {
        return Compressor.compressCurveLinear(1.0, compressor);
    }

    // See `fullRangeGainLinear`. This returns the value in dB.
    public static fullRangeGainDb(compressor: ICompressorSettings): number {
        const linearResult = Compressor.compressCurveLinear(1.0, compressor);
        return Db.linearToDb(linearResult);
    }

    // Makeup gain is the default gain applied to the output of the compressor
    // to "make up" for the gain reduction caused by compression.
    //
    // https://webaudio.github.io/web-audio-api/#computing-the-makeup-gain
    public static makeupGainLinear(compressor: ICompressorSettings): number {
        const fullRangeGain = Compressor.fullRangeGainLinear(compressor);

        // The spec says "inverse of full range gain", but that's not clear. We
        // assume reciprocal here to match Chrome's impl:
        //
        // https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/platform/audio/dynamics_compressor.cc;l=168;drc=7666bc1983c2a5b98e5dc6fa6c28f8f53c07d06f?q=dynamics&ss=chromium%2Fchromium%2Fsrc
        const fullRangeMakeupGain = 1.0 / fullRangeGain;

        // "Return the result of taking the 0.6 power of full range makeup gain."
        const makeupGain = Math.pow(fullRangeMakeupGain, 0.6);
        return makeupGain;
    }

    // See `makeupGainLinear`. This returns the value in dB.
    public static makeupGainDb(compressor: ICompressorSettings): number {
        const linearResult = Compressor.makeupGainLinear(compressor);
        return Db.linearToDb(linearResult);
    }

}