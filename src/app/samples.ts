export function getGroupSize(length: number, samples: number): number {
    const groupSize = Math.max(Math.floor(length / samples), 1);
    return groupSize;
}

export function groupSample(arr: Float32Array, samples: number, fn: (batch: Float32Array) => number): Float32Array {
    const groupSize = getGroupSize(arr.length, samples);
    const actualSamples = Math.floor(arr.length / groupSize);
    const outputArray = new Float32Array(actualSamples);

    for (let index = 0; index < actualSamples; index++) {
        const beginIndex = groupSize * index;
        const endIndex = groupSize * (index + 1);
        const batch = arr.subarray(beginIndex, endIndex);
        outputArray[index] = fn(batch);
    }

    return outputArray;
}

export function randomSample(arr: Float32Array, samples: number): Float32Array {
    return groupSample(arr, samples, (batch) => {
        return batch[0];
    });
}

export function absMaxSample(arr: Float32Array, samples: number): Float32Array {
    return groupSample(arr, samples, (batch) => {
        const max = batch.reduce((max, v) => Math.max(max, Math.abs(v)), - Infinity);
        return max;
    });
}

export function meanSample(arr: Float32Array, samples: number): Float32Array {
    return groupSample(arr, samples, (batch) => {
        const mean = (batch.reduce((acc, v) => acc + v, 0)) / batch.length;
        return mean;
    });
}

export function absMeanSample(arr: Float32Array, samples: number): Float32Array {
    return groupSample(arr, samples, (batch) => {
        const mean = (batch.reduce((acc, v) => acc + Math.abs(v), 0)) / batch.length;
        return mean;
    });
}

export function rmsSample(arr: Float32Array, samples: number): Float32Array {
    return groupSample(arr, samples, (batch) => {
        const sumOfSquares = (batch.reduce((acc, v) => acc + (v * v), 0));
        return Math.sqrt(sumOfSquares / batch.length);
    });
}
