/**
 * AudioWorklet processor for capturing 16kHz PCM audio from the microphone.
 *
 * Converts Float32 samples to Int16 PCM and buffers before posting to the
 * main thread. Also computes RMS level for the audio visualizer.
 *
 * Loaded via: audioContext.audioWorklet.addModule("/audio-worklet-processor.js")
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Buffer 2048 Int16 samples (~128ms at 16kHz) before posting
    this.buffer = new Int16Array(2048);
    this.writeIndex = 0;
  }

  /**
   * @param {Float32Array[][]} inputs - [input#][channel#][sample#]
   * @returns {boolean} true to keep the processor alive
   */
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel || channel.length === 0) return true;

    // Compute RMS level for the visualizer (0-1 range)
    let sumSquares = 0;
    for (let i = 0; i < channel.length; i++) {
      sumSquares += channel[i] * channel[i];
    }
    const rms = Math.sqrt(sumSquares / channel.length);

    // Convert Float32 [-1, 1] → Int16 [-32768, 32767] and buffer
    for (let i = 0; i < channel.length; i++) {
      const clamped = Math.max(-1, Math.min(1, channel[i]));
      this.buffer[this.writeIndex++] = clamped * 32767;

      if (this.writeIndex >= this.buffer.length) {
        this.flush();
      }
    }

    // Post RMS level for real-time visualizer updates
    this.port.postMessage({ event: "level", data: { rms } });

    return true;
  }

  flush() {
    // Send a copy of the filled buffer to the main thread
    this.port.postMessage({
      event: "chunk",
      data: {
        int16arrayBuffer: this.buffer.slice(0, this.writeIndex).buffer,
      },
    });
    this.writeIndex = 0;
  }
}

registerProcessor("pcm-processor", PCMProcessor);
