# S-DSP Register Reference

This document provides comprehensive reference for the S-DSP (Sony Digital Signal Processor) audio chip registers in the SNES APU.

## DSP Access Method

The DSP is accessed indirectly through two SPC700 memory locations:

- **$F2 (DSP Address):** Write the DSP register address (0-127)
- **$F3 (DSP Data):** Read/write the selected DSP register

```assembly
MOV $F2, #$0C    ; Select register $0C (MVOL L)
MOV $F3, #$7F    ; Write value $7F to MVOL L
MOV A, $F3       ; Read current value from MVOL L
```

## Complete DSP Register Map

| Address | Name | Access | Description |
|---------|------|--------|-------------|
| $x0 | VOL (L) | W | Voice x left channel volume (-128 to +127) |
| $x1 | VOL (R) | W | Voice x right channel volume (-128 to +127) |
| $x2 | P (L) | W | Voice x pitch low byte |
| $x3 | P (H) | W | Voice x pitch high 6 bits |
| $x4 | SRCN | W | Voice x source number (sample directory index 0-255) |
| $x5 | ADSR (1) | W | Voice x ADSR settings byte 1 |
| $x6 | ADSR (2) | W | Voice x ADSR settings byte 2 |
| $x7 | GAIN | W | Voice x GAIN envelope control |
| $x8 | ENVX | R | Voice x current envelope value (0-127) |
| $x9 | OUTX | R | Voice x current waveform output (-128 to +127) |
| $0C | MVOL (L) | W | Main volume left (-128 to +127) |
| $1C | MVOL (R) | W | Main volume right (-128 to +127) |
| $2C | EVOL (L) | W | Echo volume left (-128 to +127) |
| $3C | EVOL (R) | W | Echo volume right (-128 to +127) |
| $4C | KON | W | Key on flags (1 bit per voice) |
| $5C | KOF | W | Key off flags (1 bit per voice) |
| $6C | FLG | W | DSP control flags |
| $7C | ENDX | R | End of sample flags (1 bit per voice) |
| $0D | EFB | W | Echo feedback volume (-128 to +127) |
| $1D | - | - | Unused |
| $2D | PMON | W | Pitch modulation enable (1 bit per voice) |
| $3D | NON | W | Noise enable (1 bit per voice) |
| $4D | EON | W | Echo enable (1 bit per voice) |
| $5D | DIR | W | Sample directory page (DIR * $100 = address) |
| $6D | ESA | W | Echo buffer start address (ESA * $100 = address) |
| $7D | EDL | W | Echo delay (4-bit: 0-15) |
| $xF | COEF | W | FIR filter coefficient (8 coefficients: $0F, $1F, ..., $7F) |

## Voice Registers (x = 0-7)

### VOL (L/R) - Voice Volume ($x0, $x1)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | S |         Volume (0-127)                    |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **8-bit signed value:** -128 to +127
- Controls stereo panning and volume
- Left=+127, Right=0: Full left
- Left=0, Right=+127: Full right
- Left=+64, Right=+64: Center with full volume
- Negative values invert phase

### P (Pitch) - Voice Pitch ($x2, $x3)

```
$x2 (P Low):
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |           Lower 8 bits of pitch                |
    +-----+-----+-----+-----+-----+-----+-----+-----+

$x3 (P High):
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |  -  |  -  |     Upper 6 bits of pitch          |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **14-bit value:** 0-16383 ($0000-$3FFF)
- Controls playback rate of sample

**Pitch Calculation:**
```
Hz to Pitch: P = (Hz / 32000) * 4096
Pitch to Hz: Hz = (P / 4096) * 32000

Simplified:
Hz to Pitch: P = Hz / 7.8125
Pitch to Hz: Hz = P * 7.8125
```

**Pitch Scale:**
```
$0400 = -2 octaves (8000 Hz)
$0800 = -1 octave  (16000 Hz)
$1000 = Original   (32000 Hz) <- Best quality!
$2000 = +1 octave  (64000 Hz)
$3FFF = +2 octaves (~128000 Hz)
```

### SRCN - Source Number ($x4)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |          Source Number (0-255)                 |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **Index into sample directory:** 0-255
- Sample directory location: DIR * $100
- Each directory entry: 4 bytes (start address word, loop address word)
- Directory entry for sample N at: (DIR * $100) + (N * 4)

### ADSR - Envelope Generator ($x5, $x6)

```
$x5 (ADSR 1):
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |ADSR |    DR (Decay)     |    AR (Attack)      |
    +-----+-----+-----+-----+-----+-----+-----+-----+

$x6 (ADSR 2):
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |    SL (Sustain Level)   |    SR (Sustain)     |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**ADSR Enable (bit 7 of $x5):**
- 1 = ADSR mode enabled
- 0 = GAIN mode enabled (use $x7)

**Attack Rate (AR - bits 0-3 of $x5):** Time from 0 to max (1)
| Value | Time | Value | Time | Value | Time | Value | Time |
|-------|------|-------|------|-------|------|-------|------|
| $0 | 4.1s | $4 | 640ms | $8 | 96ms | $C | 16ms |
| $1 | 2.5s | $5 | 380ms | $9 | 64ms | $D | 10ms |
| $2 | 1.5s | $6 | 260ms | $A | 40ms | $E | 6ms |
| $3 | 1.0s | $7 | 160ms | $B | 24ms | $F | 0ms (instant) |

**Decay Rate (DR - bits 4-6 of $x5):** Time from max (1) to sustain level
| Value | Time | Value | Time |
|-------|------|-------|------|
| $0 | 1.2s | $4 | 180ms |
| $1 | 740ms | $5 | 110ms |
| $2 | 440ms | $6 | 74ms |
| $3 | 290ms | $7 | 37ms |

**Sustain Level (SL - bits 5-7 of $x6):** Target level for decay
| Value | Level | Value | Level |
|-------|-------|-------|-------|
| $0 | 1/8 | $4 | 5/8 |
| $1 | 2/8 | $5 | 6/8 |
| $2 | 3/8 | $6 | 7/8 |
| $3 | 4/8 | $7 | 8/8 (full) |

**Sustain Rate (SR - bits 0-4 of $x6):** Decay from sustain level to 0
| Value | Time | Value | Time | Value | Time | Value | Time |
|-------|------|-------|------|-------|------|-------|------|
| $00 | ∞ | $08 | 7.1s | $10 | 1.2s | $18 | 180ms |
| $01 | 38s | $09 | 5.9s | $11 | 880ms | $19 | 150ms |
| $02 | 28s | $0A | 4.7s | $12 | 740ms | $1A | 110ms |
| $03 | 24s | $0B | 3.5s | $13 | 590ms | $1B | 92ms |
| $04 | 19s | $0C | 2.9s | $14 | 440ms | $1C | 74ms |
| $05 | 14s | $0D | 2.4s | $15 | 370ms | $1D | 55ms |
| $06 | 12s | $0E | 1.8s | $16 | 290ms | $1E | 37ms |
| $07 | 9.4s | $0F | 1.5s | $17 | 220ms | $1F | 18ms |

**Envelope Visualization:**
```
   1 |--------              Attack
     |       /\              /
     |      /| \            /
     |     / |  \          /  Decay
     |    /  |   \        /  /
   SL|---/---|-----\__   /  /
     |  /    |    |   \_/  /
     | /AR   | DR |   SR  /
     |/      |    |      /
     |-------------------
     0                  | Key Off
     
     Key On          Key Off
```

### GAIN - Manual Envelope Control ($x7)

Used when ADSR is disabled (bit 7 of $x5 = 0).

```
Direct Mode (bit 7 = 0):
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |  0  |          Direct Value (0-127)            |
    +-----+-----+-----+-----+-----+-----+-----+-----+

Increase Linear (bits 7-5 = 110):
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |  1  |  1  |  0  |      Rate (0-31)             |
    +-----+-----+-----+-----+-----+-----+-----+-----+

Increase Bent (bits 7-5 = 111):
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |  1  |  1  |  1  |      Rate (0-31)             |
    +-----+-----+-----+-----+-----+-----+-----+-----+

Decrease Linear (bits 7-5 = 100):
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |  1  |  0  |  0  |      Rate (0-31)             |
    +-----+-----+-----+-----+-----+-----+-----+-----+

Decrease Exponential (bits 7-5 = 101):
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |  1  |  0  |  1  |      Rate (0-31)             |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**Mode Descriptions:**
- **Direct:** ENVX = value immediately
- **Increase Linear:** ENVX += 1/64 each step
- **Increase Bent:** ENVX += 1/64 until 3/4, then += 1/256
- **Decrease Linear:** ENVX -= 1/64 each step
- **Decrease Exponential:** ENVX *= 255/256 each step

**Rate Timings (Increase 0→1 / Decrease 1→0):**
| Rate | Linear Inc | Bent Inc | Linear Dec | Exp Dec |
|------|-----------|----------|------------|---------|
| $00 | ∞ | ∞ | ∞ | ∞ |
| $01 | 4.1s | 7.2s | 4.1s | 38s |
| $02 | 3.1s | 5.4s | 3.1s | 28s |
| $0F | 160ms | 280ms | 160ms | 1.5s |
| $10 | 130ms | 220ms | 130ms | 1.2s |
| $1F | 2ms | 3.5ms | 2ms | 18ms |

### ENVX - Current Envelope Value ($x8, Read Only)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |  0  |      Current Envelope (0-127)            |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **7-bit unsigned:** 0-127
- Updated by DSP based on ADSR/GAIN settings
- Multiply by this before volume to get final output

### OUTX - Current Waveform Output ($x9, Read Only)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | S |      Current Waveform (0-127)              |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **8-bit signed:** -128 to +127
- Current sample value after envelope multiplication
- Before final volume multiplication
- Useful for pitch modulation and monitoring

## Global Registers

### MVOL/EVOL - Main/Echo Volume ($0C, $1C, $2C, $3C)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | S |          Volume (0-127)                    |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **8-bit signed:** -128 to +127
- $0C/$1C: Main output volume (L/R)
- $2C/$3C: Echo output volume (L/R)
- Main and echo volumes are independent
- Echo can still be heard even if main volume is 0

### KON - Key On ($4C)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | V7  | V6  | V5  | V4  | V3  | V2  | V1  | V0  |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **Write 1 to start/restart voice**
- Resets sample playback to start address
- Resets ADSR/GAIN envelope to attack phase
- **Important:** Wait a few cycles between successive KON writes
- Writing 1 while voice already on will restart it

### KOF - Key Off ($5C)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | V7  | V6  | V5  | V4  | V3  | V2  | V1  | V0  |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **Write 1 to release voice**
- Enters release phase (fade out)
- Fade takes ~8ms (subtracts 1/256 per step)
- **Important:** Wait a few cycles between successive KOF writes

### FLG - DSP Flags ($6C)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |RESET|MUTE |~ECEN|    NOISE CLOCK (0-31)       |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**RESET (bit 7):** Soft reset
- Suspends all voices in "key-on suspension"
- Sets MUTE flag
- Triggered on power-on

**MUTE (bit 6):** Mute all output
- Silences all 8 channels immediately
- Set automatically by RESET

**ECEN (bit 5):** Echo enable (inverted)
- 0 = Echo writing enabled to external RAM
- 1 = Echo writing disabled
- **Warning:** Echo can overwrite program/data! Be careful when enabling.

**NOISE CLOCK (bits 0-4):** White noise frequency
| Value | Freq | Value | Freq | Value | Freq | Value | Freq |
|-------|------|-------|------|-------|------|-------|------|
| $00 | 0Hz | $08 | 83Hz | $10 | 500Hz | $18 | 3.2kHz |
| $01 | 16Hz | $09 | 100Hz | $11 | 667Hz | $19 | 4.0kHz |
| $02 | 21Hz | $0A | 125Hz | $12 | 800Hz | $1A | 5.3kHz |
| $03 | 25Hz | $0B | 167Hz | $13 | 1.0kHz | $1B | 6.4kHz |
| $04 | 31Hz | $0C | 200Hz | $14 | 1.3kHz | $1C | 8.0kHz |
| $05 | 42Hz | $0D | 250Hz | $15 | 1.6kHz | $1D | 10.7kHz |
| $06 | 50Hz | $0E | 333Hz | $16 | 2.0kHz | $1E | 16kHz |
| $07 | 63Hz | $0F | 400Hz | $17 | 2.7kHz | $1F | 32kHz |

### ENDX - End Flags ($7C, Read Only)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | V7  | V6  | V5  | V4  | V3  | V2  | V1  | V0  |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **1 = Voice reached end of sample (END bit in BRR block)**
- Set by DSP when BRR decoder encounters END flag
- Useful for detecting when samples finish
- Can be used to trigger sample chains

### EFB - Echo Feedback ($0D)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | S |        Feedback Level (0-127)              |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **8-bit signed:** -128 to +127
- Controls echo feedback amount
- Higher values = more repeats
- Negative values invert phase of feedback
- **Warning:** High values can cause runaway feedback!

### PMON - Pitch Modulation ($2D)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | V7  | V6  | V5  | V4  | V3  | V2  | V1  |  -  |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **Voice 0 cannot use pitch modulation** (bit 0 ignored)
- When enabled for voice N:
  - Voice N's pitch is modulated by OUTX of voice N-1
  - Formula: `P_modulated = P[N] * (1 + OUTX[N-1])`
  - Voice N-1 can be silent (set volumes to 0)
- Creates vibrato effect when modulation source is sine wave

**Example:** Voice 1 modulated by voice 0:
```
; Voice 0: Silent sine wave for modulation
MOV $F2, #$00 : MOV $F3, #$00  ; Voice 0 VOL L = 0
MOV $F2, #$01 : MOV $F3, #$00  ; Voice 0 VOL R = 0
MOV $F2, #$04 : MOV $F3, #$0A  ; Voice 0 SRCN = sine sample

; Voice 1: Audible sound to be modulated
MOV $F2, #$10 : MOV $F3, #$7F  ; Voice 1 VOL L = max
MOV $F2, #$14 : MOV $F3, #$05  ; Voice 1 SRCN = instrument

; Enable pitch mod for voice 1
MOV $F2, #$2D : MOV $F3, #$02  ; PMON bit 1 = 1
```

### NON - Noise Enable ($3D)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | V7  | V6  | V5  | V4  | V3  | V2  | V1  | V0  |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **1 = Voice uses white noise instead of sample data**
- Noise frequency set by NOISE CLOCK in FLG register
- Still requires sample (for timing/length/loop)
- Useful for drums, hi-hats, sound effects

### EON - Echo Enable ($4D)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | V7  | V6  | V5  | V4  | V3  | V2  | V1  | V0  |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **1 = Voice output sent to echo processor**
- Multiple voices can echo simultaneously
- Echo volume set by EVOL registers
- **Must enable echo writing** (ECEN bit in FLG) first!

### DIR - Sample Directory ($5D)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |          Directory Page (0-255)                |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **Sample directory address:** DIR * $100
- Directory is array of 4-byte entries (256 samples max)
- Each entry: 2-byte start address, 2-byte loop address
- Addresses are in BRR sample memory space

**Directory Structure:**
```
Address            Content
DIR*$100 + 0:  Sample 0 start address (word)
DIR*$100 + 2:  Sample 0 loop address (word)
DIR*$100 + 4:  Sample 1 start address (word)
DIR*$100 + 6:  Sample 1 loop address (word)
...
DIR*$100 + 1020: Sample 255 start (word)
DIR*$100 + 1022: Sample 255 loop (word)
```

### ESA - Echo Start Address ($6D)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |          Echo Buffer Page (0-255)              |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **Echo buffer start:** ESA * $100
- Points to RAM region for echo buffer
- **Warning:** Echo will write to this region!
- Make sure it doesn't overlap program/data/samples

### EDL - Echo Delay Length ($7D)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |  -  |  -  |  -  |  -  |   Echo Delay (0-15)   |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **4-bit value:** 0-15
- **Delay time:** EDL * 16ms (0-240ms)
- **Memory required:** EDL * 2KB (0-30KB max)
- **Buffer size:** `[ESA*$100] to [ESA*$100 + EDL*$800 - 1]`
- Even if EDL=0, 4 bytes at `[ESA*$100]` to `[ESA*$100 + 3]` are still used

**Echo Delay Table:**
| EDL | Time | Memory | EDL | Time | Memory |
|-----|------|--------|-----|------|--------|
| $0 | 0ms | 4 bytes* | $8 | 128ms | 16KB |
| $1 | 16ms | 2KB | $9 | 144ms | 18KB |
| $2 | 32ms | 4KB | $A | 160ms | 20KB |
| $3 | 48ms | 6KB | $B | 176ms | 22KB |
| $4 | 64ms | 8KB | $C | 192ms | 24KB |
| $5 | 80ms | 10KB | $D | 208ms | 26KB |
| $6 | 96ms | 12KB | $E | 224ms | 28KB |
| $7 | 112ms | 14KB | $F | 240ms | 30KB |

### COEF - FIR Filter Coefficients ($xF)

```
$0F, $1F, $2F, $3F, $4F, $5F, $6F, $7F (8 coefficients):

Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | S |        Coefficient (0-127)                 |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

- **8-bit signed:** -128 to +127
- 8-tap FIR filter for echo processing
- Applied to echo output
- Setting all to 127,0,0,0,0,0,0,0 = no filtering (original sound)

**Common Filter Values:**
```
; No echo effect (original)
127, 0, 0, 0, 0, 0, 0, 0

; Low-pass filter (muffled echo)
64, 32, 16, 8, 4, 2, 1, 0

; High-pass filter (tinny echo)
-64, 32, -16, 8, -4, 2, -1, 0
```

## Echo System Operation

The echo system provides reverb/delay effects.

### Echo Initialization Sequence

```assembly
; 1. Set echo buffer location
MOV $F2, #$6D : MOV $F3, #$20    ; ESA = $20 (buffer at $2000)

; 2. Set echo delay
MOV $F2, #$7D : MOV $F3, #$04    ; EDL = 4 (64ms delay, 8KB buffer)

; 3. Set FIR filter coefficients
MOV $F2, #$0F : MOV $F3, #$7F    ; COEF 0 = 127
MOV $F2, #$1F : MOV $F3, #$00    ; COEF 1 = 0
MOV $F2, #$2F : MOV $F3, #$00    ; COEF 2 = 0
MOV $F2, #$3F : MOV $F3, #$00    ; COEF 3 = 0
MOV $F2, #$4F : MOV $F3, #$00    ; COEF 4 = 0
MOV $F2, #$5F : MOV $F3, #$00    ; COEF 5 = 0
MOV $F2, #$6F : MOV $F3, #$00    ; COEF 6 = 0
MOV $F2, #$7F : MOV $F3, #$00    ; COEF 7 = 0

; 4. Set echo feedback
MOV $F2, #$0D : MOV $F3, #$40    ; EFB = 64 (moderate feedback)

; 5. Enable echo for desired voices
MOV $F2, #$4D : MOV $F3, #$FF    ; EON = all voices echo

; 6. ** CRITICAL: Wait 240ms for buffer initialization! **
; (or wait EDL*16ms if you know previous EDL value)

; 7. Set echo volume
MOV $F2, #$2C : MOV $F3, #$40    ; EVOL L = 64
MOV $F2, #$3C : MOV $F3, #$40    ; EVOL R = 64

; 8. Enable echo writing
MOV $F2, #$6C
MOV A, $F3
AND A, #$DF                       ; Clear bit 5 (ECEN inverted)
MOV $F3, A

; Echo is now active!
```

### Echo Memory Safety

**CRITICAL:** Echo writes to RAM and can corrupt your program!

**Buffer Location Formula:**
```
Start: ESA * $100
End:   ESA * $100 + EDL * $800 - 1

Example: ESA=$20, EDL=$04
Start: $2000
End:   $2000 + $2000 - 1 = $3FFF
Buffer uses: $2000-$3FFF (8KB)
```

**Safe Buffer Placement:**
- Place at end of RAM ($F000-$FFBF)
- Or in unused region between program and samples
- **Never** overlap with:
  - Program code
  - Variables
  - Stack ($0100-$01FF)
  - Sample data
  - Sample directory

**Echo Wraparound Warning:**
- Echo buffer wraps at $10000 boundary
- If ESA=$FF and EDL=$0F:
  - Start: $FF00
  - Size: 30KB
  - Wraps around to $0000!
  - Will corrupt zero page, registers, stack!

## Sample Directory Structure

The sample directory maps SRCN values to actual sample addresses in memory.

```
Directory at: DIR * $100

Entry N (SRCN = N):
  Offset 0-1: Sample start address (16-bit, little-endian)
  Offset 2-3: Loop point address (16-bit, little-endian)

Total size: 256 entries * 4 bytes = 1024 bytes
```

**Example Directory Setup:**
```assembly
; Directory at $1000
MOV $F2, #$5D : MOV $F3, #$10    ; DIR = $10

; Sample 0 entry at $1000-$1003
; Start: $2000, Loop: $2020
.org $1000
.dw $2000    ; Start address
.dw $2020    ; Loop address

; Sample 1 entry at $1004-$1007
; Start: $2100, Loop: $2120
.dw $2100    ; Start address
.dw $2120    ; Loop address

; etc...
```

## BRR Sample Format

See SPC700-opcodes.md for complete BRR format documentation.

**Quick Reference:**
- 9-byte blocks: 1 header + 8 data bytes
- Header: RANGE (4 bits), FILTER (2 bits), LOOP (1 bit), END (1 bit)
- Each data byte contains 2 4-bit samples (high nibble first)
- LOOP flag: Set for all blocks in looped samples
- END flag: Set for last block; playback stops or loops

## Timing and Performance

### DSP Operation
- Processes one voice per 32KHz sample period
- All 8 voices processed in 8/32000 seconds
- Voice processing is round-robin
- Echo/FIR filter processing during remaining time

### Cycle Timing
- Reading/writing DSP registers takes SPC700 cycles
- No cycle penalty from DSP side
- DSP and SPC700 operate independently

### Best Practices
- Batch DSP register writes when possible
- Don't write KON/KOF in rapid succession
- Allow time between voice configuration and KON
- Wait 240ms after changing ESA/EDL before enabling echo

## Common Issues and Solutions

### Issue: Voice doesn't play
- Check: KON bit set?
- Check: Volume not zero?
- Check: Valid SRCN and sample directory?
- Check: Sample data is valid BRR?
- Check: MUTE flag not set?

### Issue: Crackling/pops
- Likely: Discontinuous samples
- Solution: Use smooth transitions, fade out before stopping
- Or: Use KOF instead of abrupt volume changes

### Issue: Echo crashes program
- Likely: Echo buffer overlaps code/data
- Solution: Calculate buffer size, place safely
- Check: ESA * $100 + EDL * $800 doesn't overlap anything

### Issue: No echo heard
- Check: ECEN bit cleared (bit 5 of $6C)?
- Check: EON bits set for voices?
- Check: EVOL not zero?
- Check: Waited 240ms after changing ESA/EDL?

### Issue: Pitch modulation doesn't work
- Check: PMON bit 0 is ignored (can't modulate voice 0)
- Check: Modulation source voice (N-1) is playing
- Check: OUTX of source voice is non-zero

## Register Quick Reference Table

| Reg | Name | Type | Function |
|-----|------|------|----------|
| $x0 | VOL(L) | W | Voice volume left |
| $x1 | VOL(R) | W | Voice volume right |
| $x2 | P(L) | W | Pitch low |
| $x3 | P(H) | W | Pitch high |
| $x4 | SRCN | W | Source number |
| $x5 | ADSR1 | W | ADSR settings |
| $x6 | ADSR2 | W | ADSR settings |
| $x7 | GAIN | W | Gain mode |
| $x8 | ENVX | R | Current envelope |
| $x9 | OUTX | R | Current output |
| $0C | MVOL(L) | W | Main volume left |
| $1C | MVOL(R) | W | Main volume right |
| $2C | EVOL(L) | W | Echo volume left |
| $3C | EVOL(R) | W | Echo volume right |
| $4C | KON | W | Key on |
| $5C | KOF | W | Key off |
| $6C | FLG | W | Control flags |
| $7C | ENDX | R | End flags |
| $0D | EFB | W | Echo feedback |
| $2D | PMON | W | Pitch modulation |
| $3D | NON | W | Noise enable |
| $4D | EON | W | Echo enable |
| $5D | DIR | W | Sample directory |
| $6D | ESA | W | Echo start address |
| $7D | EDL | W | Echo delay length |
| $xF | COEF | W | FIR coefficients |

## References

- [Super Famicom Dev Wiki - SPC700 Reference](https://wiki.superfamicom.org/spc700-reference)
- Sony S-DSP datasheet and documentation
- Various SNES audio programming guides and tutorials
