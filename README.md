# Compressor visualizer

A simple app to visualize the effect that compressors have on audio.

## Usage

```pwsh
# Initial setup
npm install

# Inner loop
npm run dev
```

This is built with D3 as React components in an Astro host.

### Testing

```pwsh
# Run tests
npm test
npm test -- --run # helpful for Claude; run tests once.

# Clear Vitest cache (if tests fail to run)
npx vitest --clearCache
```

## Acknowledgements

* `MS0901_SnareNoComp.wav` is from Campbridge Music Technology's Mixing Secrets Chapter 9: [Compressing for a reason](https://cambridge-mt.com/ms3/ch9/).