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