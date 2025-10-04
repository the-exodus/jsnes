# S-PPU Register Reference

This document provides comprehensive reference for the S-PPU (Picture Processing Unit) registers in the SNES.

## Register Overview

The PPU consists of two chips:
- **S-PPU1 (5C77):** Handles background rendering, tile/map management, and VRAM access
- **S-PPU2 (5C78):** Handles sprites (OBJs), color math, and final video output

All PPU registers are mapped to addresses $2100-$213F.

## Complete Register Map

| Address | Name | Access | S-PPU | Description |
|---------|------|--------|-------|-------------|
| $2100 | INIDISP | W | PPU2 | Display control and brightness |
| $2101 | OBSEL | W | PPU1 | Object (sprite) size and base address |
| $2102 | OAMADDL | W | PPU1 | OAM address low byte |
| $2103 | OAMADDH | W | PPU1 | OAM address high byte and priority |
| $2104 | OAMDATA | W | PPU1 | OAM data write |
| $2105 | BGMODE | W | PPU1 | BG mode and character size |
| $2106 | MOSAIC | W | PPU1 | Mosaic size and enable |
| $2107 | BG1SC | W | PPU1 | BG1 tilemap address and size |
| $2108 | BG2SC | W | PPU1 | BG2 tilemap address and size |
| $2109 | BG3SC | W | PPU1 | BG3 tilemap address and size |
| $210A | BG4SC | W | PPU1 | BG4 tilemap address and size |
| $210B | BG12NBA | W | PPU1 | BG1/BG2 character data address |
| $210C | BG34NBA | W | PPU1 | BG3/BG4 character data address |
| $210D | BG1HOFS | W2 | PPU1 | BG1 horizontal scroll (X) |
| $210E | BG1VOFS | W2 | PPU1 | BG1 vertical scroll (Y) |
| $210F | BG2HOFS | W2 | PPU1 | BG2 horizontal scroll (X) |
| $2110 | BG2VOFS | W2 | PPU1 | BG2 vertical scroll (Y) |
| $2111 | BG3HOFS | W2 | PPU1 | BG3 horizontal scroll (X) |
| $2112 | BG3VOFS | W2 | PPU1 | BG3 vertical scroll (Y) |
| $2113 | BG4HOFS | W2 | PPU1 | BG4 horizontal scroll (X) |
| $2114 | BG4VOFS | W2 | PPU1 | BG4 vertical scroll (Y) |
| $2115 | VMAIN | W | PPU1 | VRAM address increment mode |
| $2116 | VMADDL | W | PPU1 | VRAM address low byte |
| $2117 | VMADDH | W | PPU1 | VRAM address high byte |
| $2118 | VMDATAL | W | PPU1 | VRAM data write low byte |
| $2119 | VMDATAH | W | PPU1 | VRAM data write high byte |
| $211A | M7SEL | W | PPU1 | Mode 7 settings |
| $211B | M7A | W2 | PPU1 | Mode 7 matrix A (also multiply) |
| $211C | M7B | W2 | PPU1 | Mode 7 matrix B (also multiply) |
| $211D | M7C | W2 | PPU1 | Mode 7 matrix C |
| $211E | M7D | W2 | PPU1 | Mode 7 matrix D |
| $211F | M7X | W2 | PPU1 | Mode 7 center X |
| $2120 | M7Y | W2 | PPU1 | Mode 7 center Y |
| $2121 | CGADD | W | PPU2 | CGRAM (palette) address |
| $2122 | CGDATA | W2 | PPU2 | CGRAM data write |
| $2123 | W12SEL | W | PPU2 | Window mask settings for BG1/BG2 |
| $2124 | W34SEL | W | PPU2 | Window mask settings for BG3/BG4 |
| $2125 | WOBJSEL | W | PPU2 | Window mask settings for OBJ/Color |
| $2126 | WH0 | W | PPU2 | Window 1 left position |
| $2127 | WH1 | W | PPU2 | Window 1 right position |
| $2128 | WH2 | W | PPU2 | Window 2 left position |
| $2129 | WH3 | W | PPU2 | Window 2 right position |
| $212A | WBGLOG | W | PPU2 | Window mask logic for BGs |
| $212B | WOBJLOG | W | PPU2 | Window mask logic for OBJs/Color |
| $212C | TM | W | PPU2 | Main screen designation |
| $212D | TS | W | PPU2 | Sub screen designation |
| $212E | TMW | W | PPU2 | Window mask designation for main screen |
| $212F | TSW | W | PPU2 | Window mask designation for sub screen |
| $2130 | CGWSEL | W | PPU2 | Color math control A |
| $2131 | CGADSUB | W | PPU2 | Color math control B |
| $2132 | COLDATA | W | PPU2 | Fixed color data |
| $2133 | SETINI | W | PPU2 | Display control 2 |
| $2134 | MPYL | R | PPU2 | Multiplication result low byte |
| $2135 | MPYM | R | PPU2 | Multiplication result middle byte |
| $2136 | MPYH | R | PPU2 | Multiplication result high byte |
| $2137 | SLHV | R | PPU2 | Software latch for H/V counters |
| $2138 | OAMDATAREAD | R | PPU1 | OAM data read |
| $2139 | VMDATALREAD | R | PPU1 | VRAM data read low byte |
| $213A | VMDATAHREAD | R | PPU1 | VRAM data read high byte |
| $213B | CGDATAREAD | R | PPU2 | CGRAM data read |
| $213C | OPHCT | R2 | PPU2 | Horizontal scanline location |
| $213D | OPVCT | R2 | PPU2 | Vertical scanline location |
| $213E | STAT77 | R | PPU1 | PPU1 status and version |
| $213F | STAT78 | R | PPU2 | PPU2 status and version |

**Access Key:**
- W = Write only
- R = Read only
- W2 = Write twice (first write = low byte, second write = high byte)
- R2 = Read twice (first read = low byte, second read = high byte)

## Display Control Registers

### $2100 - INIDISP - Display Control 1 (W)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |BLANK| -   -   - |    BRIGHTNESS (0-15)        |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**BLANK (Bit 7):** Forced Blanking
- 0 = Normal display
- 1 = Screen black (forced blank)
- During forced blank: VRAM, OAM, and CGRAM can be freely accessed
- TV still receives Vsync/Hsync (stable black picture)
- CPU still receives Hblank/Vblank signals (NMIs, IRQs, HDMAs continue)

**BRIGHTNESS (Bits 0-3):** Master Brightness
- 0 = Screen black
- 1-15 = Brightness * (N+1)/16
- Example: 15 = full brightness, 7 = half brightness

### $2133 - SETINI - Display Control 2 (W)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |EXTSY|EXTBG|PSHIR| -   |OBJI |BGINT|PPUOV|SCINT|
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**EXTSY (Bit 7):** External Synchronization
- 0 = Normal
- 1 = Super impose and external sync

**EXTBG (Bit 6):** Mode 7 EXTBG (Screen expand)
- 0 = Normal 256-color BG
- 1 = Enable 128-color BG with priority per pixel

**PSHIR (Bit 5):** Pseudo Hires Mode
- 0 = Normal 256-pixel mode
- 1 = 512-pixel pseudo-hires mode

**OBJI (Bit 4):** OBJ Interlace
- 0 = Normal
- 1 = Interlaced OBJ display

**BGINT (Bit 3):** BG Interlace
- 0 = Normal
- 1 = Interlaced BG display

**PPUOV (Bit 2):** Overscan Mode
- 0 = 224 lines
- 1 = 239 lines

**SCINT (Bit 1):** Screen Interlace
- 0 = Non-interlaced (262/312 scanlines)
- 1 = Interlaced (525/625 scanlines)

## Background Control Registers

### $2105 - BGMODE - BG Mode and Character Size (W)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | BG4 | BG3 | BG2 | BG1 |BG3P |    BG MODE        |
    |TILE |TILE |TILE |TILE |PRIO |    (0-7)          |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**BG4/3/2/1 TILE (Bits 7-4):** Tile Size
- 0 = 8x8 pixels
- 1 = 16x16 pixels
- Note: Mode 5 uses 16x8, Mode 6 uses 16x8, Mode 7 uses 8x8 (fixed)

**BG3 PRIO (Bit 3):** BG3 Priority in Mode 1
- 0 = Normal priority
- 1 = High priority

**BG MODE (Bits 2-0):** Background Mode

| Mode | BG1 | BG2 | BG3 | BG4 | Description |
|------|-----|-----|-----|-----|-------------|
| 0 | 4-color | 4-color | 4-color | 4-color | Normal mode |
| 1 | 16-color | 16-color | 4-color | - | Normal mode |
| 2 | 16-color | 16-color | (OPT) | - | Offset-per-tile |
| 3 | 256-color | 16-color | - | - | Normal mode |
| 4 | 256-color | 4-color | (OPT) | - | Offset-per-tile |
| 5 | 16-color | 4-color | - | - | 512-pixel hires |
| 6 | 16-color | - | (OPT) | - | 512-pixel + offset-per-tile |
| 7 | 256-color | EXTBG | - | - | Rotation/Scaling |

**Mode Notes:**
- Mode 7 supports rotation/scaling and EXTBG (but doesn't support H/V flip)
- Mode 5/6 don't support color math addition/subtraction
- Direct Color Select supported on BG1 of Mode 3/4, and BG1/BG2 of Mode 7

### $2106 - MOSAIC - Mosaic Size and Enable (W)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |    MOSAIC SIZE      |BG4EN|BG3EN|BG2EN|BG1EN|
    |    (0-15)           |     |     |     |     |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**MOSAIC SIZE (Bits 7-4):** Size
- 0 = Smallest (1x1 pixels, normal)
- 15 = Largest (16x16 pixels)
- Divides BG into NxN pixel blocks
- Hardware picks upper-left pixel of each block
- Fills whole block with that color

**BG4/3/2/1 EN (Bits 3-0):** Mosaic Enable
- 0 = Mosaic off
- 1 = Mosaic on

### $2107-$210A - BG1SC-BG4SC - BG Tilemap Address and Size (W)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |      TILEMAP BASE ADDR      | V   | H   |
    |      (Bits 15-11)           | MIR | MIR |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**TILEMAP BASE ADDR (Bits 7-2):** Base Address
- Base address in VRAM = N * $400 (1K units)
- Range: $0000-$FC00

**V MIR/H MIR (Bits 1-0):** Tilemap Size
- 0 (00b) = 32x32 tiles (1 screen)
- 1 (01b) = 64x32 tiles (2 screens horizontal)
- 2 (10b) = 32x64 tiles (2 screens vertical)
- 3 (11b) = 64x64 tiles (4 screens)

**Tilemap Layout:**
```
Size 0 (32x32):     Size 1 (64x32):     Size 2 (32x64):     Size 3 (64x64):
┌────────┐          ┌────────┬────────┐ ┌────────┐          ┌────────┬────────┐
│  SC0   │          │  SC0   │  SC1   │ │  SC0   │          │  SC0   │  SC1   │
│        │          │        │        │ ├────────┤          ├────────┼────────┤
│ (32x32)│          │ (32x32)│ (32x32)│ │  SC1   │          │  SC2   │  SC3   │
└────────┘          └────────┴────────┘ │        │          │        │        │
                                         │ (32x32)│          │ (32x32)│ (32x32)│
                                         └────────┘          └────────┴────────┘
```

**Note:** Ignored in Mode 7 (base always 0, size always 128x128 tiles)

### $210B-$210C - BG12NBA/BG34NBA - BG Character Data Address (W)

```
$210B (BG12NBA):
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |    BG2 CHR BASE     |    BG1 CHR BASE     |
    |    (0-15)           |    (0-15)           |
    +-----+-----+-----+-----+-----+-----+-----+-----+

$210C (BG34NBA):
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |    BG4 CHR BASE     |    BG3 CHR BASE     |
    |    (0-15)           |    (0-15)           |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**BGn CHR BASE:** Character Tile Base Address
- Base address in VRAM = N * $1000 (4K-word units)
- Range: $0000-$F000
- Each value addresses 8KB of tile data

### $210D-$2114 - BGnHOFS/BGnVOFS - BG Scroll Offsets (W2)

```
Write twice for each register:
  1st write: Low 8 bits
  2nd write: High 3 bits (upper 5 bits ignored)
```

**Write Order:**
```
BGnHOFS = (Current<<8) | (Prev&~7) | ((Reg>>8)&7)
Prev = Current

BGnVOFS = (Current<<8) | Prev
Prev = Current
```

**Note:** $210D/$210E are also M7HOFS/M7VOFS. Writing to $210D updates both BG1HOFS and M7HOFS (via separate internal mechanisms).

## Object (Sprite) Registers

### $2101 - OBSEL - Object Size and Base Address (W)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |   OBJ SIZE SELECT   |NGADDR |  BASE ADDR      |
    |   (0-5)             |(GAP)  |  (0-7)          |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**OBJ SIZE SELECT (Bits 7-5):** Sprite Sizes

| Value | Small | Large | Notes |
|-------|-------|-------|-------|
| 0 | 8x8 | 16x16 | Caution: In 224-line mode, |
| 1 | 8x8 | 32x32 | OBJs with 64-pixel height |
| 2 | 8x8 | 64x64 | may wrap from lower to |
| 3 | 16x16 | 32x32 | upper screen border. |
| 4 | 16x16 | 64x64 | |
| 5 | 32x32 | 64x64 | |
| 6-7 | Reserved | Reserved | Don't use |

**NGADDR (Bit 4):** Name Gap Address
- 0 = Name table at Base, Base+$1000
- 1 = Name table at Base, Base+$1000 + gap

**BASE ADDR (Bits 2-0):** Base Address
- Base address in VRAM = (N * $2000) + (NGADDR * $1000)
- Name Select = ((Tile#>>8)&1) XOR NGADDR

### $2102-$2103 - OAMADDL/OAMADDH - OAM Address (W)

```
$2102 (OAMADDL):
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |             OAM ADDRESS (Low)                 |
    +-----+-----+-----+-----+-----+-----+-----+-----+

$2103 (OAMADDH):
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |PRIOR| -   -   -   -   -   -   |OAM ADDR (Hi)|
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**OAM ADDRESS:** Address in OAM
- 9-bit address (0-$1FF)
- $000-$1FF = 512 bytes (128 sprites * 4 bytes)
- $200-$21F = 32 bytes (128 sprites * 2 bits for X high bit and size)

**PRIOR (Bit 7):** Priority Rotation
- 0 = Normal priority
- 1 = Priority rotation (sprite at OAM address becomes highest priority)

### $2104 - OAMDATA - OAM Data Write (W)

Writes data to OAM at current address, then increments address.

**OAM Structure ($000-$1FF):** 128 Sprites * 4 Bytes

```
Byte 0: X position (low 8 bits)
Byte 1: Y position (all 8 bits)
Byte 2: Tile number (low 8 bits)
Byte 3: Attributes
  Bit 7:   Y-flip (0=Normal, 1=Mirror vertically)
  Bit 6:   X-flip (0=Normal, 1=Mirror horizontally)
  Bit 5-4: Priority (0=Low..3=High)
  Bit 3-1: Palette number (0-7)
  Bit 0:   Tile number (high bit)
```

**OAM High Table ($200-$21F):** 2 Bits Per Sprite

```
Each byte contains info for 4 sprites:
Bits 7-6: Sprite N+3 (Size bit, X high bit)
Bits 5-4: Sprite N+2
Bits 3-2: Sprite N+1
Bits 1-0: Sprite N+0

For each sprite:
  Bit 1: X high bit (bit 8 of X coordinate)
  Bit 0: Size bit (0=Small, 1=Large, from OBSEL size table)
```

## VRAM Access Registers

### $2115 - VMAIN - VRAM Address Increment Mode (W)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |INC  | -   | - |    INC AMOUNT (0-3)         |
    |MODE |FFMT |RMP|    (see below)              |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**INC MODE (Bit 7):** Address Increment Timing
- 0 = Increment address after writing $2118 (low byte)
- 1 = Increment address after writing $2119 (high byte)

**FFMT (Bit 6):** Full Graphic Format (Address Translation)
- 0 = No address translation
- 1 = Address translation for tile format

**RMP (Bit 5):** Address Remapping
- Used with FFMT for complex address translation

**INC AMOUNT (Bits 1-0):** Address Increment

| Value | Increment |
|-------|-----------|
| 0 | +1 |
| 1 | +32 |
| 2 | +128 |
| 3 | +128 |

### $2116-$2117 - VMADDL/VMADDH - VRAM Address (W)

```
$2116 (VMADDL): VRAM Address Low Byte
$2117 (VMADDH): VRAM Address High Byte
```

Sets the VRAM address for reading/writing via $2118-$211A.

### $2118-$2119 - VMDATAL/VMDATAH - VRAM Data Write (W)

```
$2118 (VMDATAL): Write low byte of VRAM word
$2119 (VMDATAH): Write high byte of VRAM word
```

Writes data to VRAM at current address. Address increments based on VMAIN settings.

### $2139-$213A - VMDATALREAD/VMDATAHREAD - VRAM Data Read (R)

```
$2139 (VMDATALREAD): Read low byte of VRAM word
$213A (VMDATAHREAD): Read high byte of VRAM word
```

Reads data from VRAM at current address. Reading either register increments address.

**Note:** First read returns old pre-fetch buffer contents, second read returns actual data. Use dummy read for first access.

## Mode 7 Rotation/Scaling Registers

### $211A - M7SEL - Mode 7 Settings (W)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |SCRN | SCRN| -   -   -   -   |VFLIP|HFLIP|
    | OVER| OVER|                 |     |     |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**SCRN OVER (Bits 7-6):** Screen Over (when exceeding 128x128 tile area)
- 0 = Wrap within 128x128 tiles
- 1 = Wrap within 128x128 tiles (same as 0)
- 2 = Outside area is transparent
- 3 = Outside area filled with tile $00

**VFLIP (Bit 1):** Vertical Flip
- 0 = Normal
- 1 = Flip 256x256 "screen" vertically

**HFLIP (Bit 0):** Horizontal Flip
- 0 = Normal
- 1 = Flip 256x256 "screen" horizontally

### $211B-$211E - M7A-M7D - Mode 7 Matrix Parameters (W2)

```
Write twice for each register:
  1st write: Low 8 bits
  2nd write: High 8 bits (signed, 8.8 fixed-point)
```

These form a 2x2 transformation matrix:
```
│ M7A  M7B │   │ X │
│ M7C  M7D │ * │ Y │
```

**Values are signed 16-bit in 1.7.8 fixed-point format:**
- Range: -128.00 to +127.996
- $0100 = 1.0
- $0200 = 2.0
- $FF00 = -1.0

**Common Matrix Operations:**

**Identity (no transform):**
```
M7A = $0100, M7B = $0000
M7C = $0000, M7D = $0100
```

**Rotation by angle θ:**
```
M7A =  cos(θ) * $0100
M7B = -sin(θ) * $0100
M7C =  sin(θ) * $0100
M7D =  cos(θ) * $0100
```

**Scaling by factor S:**
```
M7A = $0100 / S
M7B = $0000
M7C = $0000
M7D = $0100 / S
```

### $211F-$2120 - M7X/M7Y - Mode 7 Center Coordinates (W2)

```
Write twice for each register:
  1st write: Low 8 bits
  2nd write: High 5 bits (signed 13-bit value)
```

**Values are signed 13-bit:**
- Range: -4096 to +4095
- Defines the center point for rotation/scaling

**Note:** $211B (M7A) also doubles as a multiplication operand. Writing to M7A or M7B latches a multiply operation.

## Color (CGRAM) Registers

### $2121 - CGADD - CGRAM Address (W)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |            CGRAM ADDRESS (0-255)              |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

Sets the palette (CGRAM) address for reading/writing via $2122/$213B.

### $2122 - CGDATA - CGRAM Data Write (W2)

```
Write twice to send a 15-bit color word:
  1st write: Low byte (GGGRRRRR)
  2nd write: High byte (0BBBBBGG)

Combined 15-bit value (0BBBBBGG GGGRRRRR):
  Bit 14-10: Blue (0-31)
  Bit 9-5:   Green (0-31)
  Bit 4-0:   Red (0-31)
```

Writes color data to CGRAM at current address, then increments address.

**Palette Layout:**
- $00: Main backdrop color
- $01-$FF: 256-color BG palette (when not using direct color mode)
- $01-$7F: Eight 16-color BG palettes
- $01-$1F: Eight 4-color BG palettes (BG1 in Mode 0, or BG2/3/4)
- $81-$FF: Eight 16-color OBJ palettes

### $213B - CGDATAREAD - CGRAM Data Read (R2)

```
Read twice to get a 15-bit color word:
  1st read: Low byte
  2nd read: High byte
```

Reads color data from CGRAM at current address, then increments address.

### $2130 - CGWSEL - Color Math Control A (W)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |CLIP | CLIP|PREVEN|PRVEN| -   - |ADDSB|DIRCOL|
    |COLR | COLR|ADDSU |MATH |       |     |     |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**CLIP COLR (Bits 7-6):** Force Main Screen Black
- 0 = Never
- 1 = Outside color window
- 2 = Inside color window
- 3 = Always

**PREVEN/PRVEN (Bits 5-4):** Color Math Enable
- 0 = Always
- 1 = Inside color window
- 2 = Outside color window
- 3 = Never

**ADDSB (Bit 1):** Sub Screen BG/OBJ Enable
- 0 = Backdrop only
- 1 = Backdrop + BG + OBJ

**DIRCOL (Bit 0):** Direct Color (for 256-color BGs)
- 0 = Use palette
- 1 = Direct color mode (BBGGGRRR format)

### $2131 - CGADSUB - Color Math Control B (W)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | ADD |HALF |  Enable Layers for Color Math     |
    | SUB | RES |BG4|BG3|BG2|BG1|OBJ|BACK|
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**ADD SUB (Bit 7):** Color Math Operation
- 0 = Add (Main + Sub)
- 1 = Subtract (Main - Sub)

**HALF RES (Bit 6):** Half Result
- 0 = No divide
- 1 = Divide result by 2

**Enable Layers (Bits 5-0):** Enable color math for:
- Bit 5: BG4
- Bit 4: BG3
- Bit 3: BG2
- Bit 2: BG1
- Bit 1: OBJ
- Bit 0: Backdrop

### $2132 - COLDATA - Fixed Color Data (W)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | -   |BLUE |GREEN| RED |    COLOR DATA (0-31)  |
    |PLANE|PLANE|PLANE|PLANE|    (5-bit intensity)  |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**BLUE/GREEN/RED PLANE (Bits 5-6):** Which color plane(s) to write
- Can set multiple bits to write multiple planes at once

**COLOR DATA (Bits 4-0):** 5-bit intensity (0-31)

**Example Usage:**
```
; Set fixed color to white RGB(31,31,31):
LDA #$3F : STA $2132  ; Red=31
LDA #$5F : STA $2132  ; Green=31
LDA #$9F : STA $2132  ; Blue=31
```

## Window Mask Registers

### $2123-$2125 - W12SEL/W34SEL/WOBJSEL - Window Mask Settings (W)

```
$2123 (W12SEL) - BG1/BG2:
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |BG2W2|BG2W2|BG2W1|BG2W1|BG1W2|BG1W2|BG1W1|BG1W1|
    |ENAB |INV  |ENAB |INV  |ENAB |INV  |ENAB |INV  |
    +-----+-----+-----+-----+-----+-----+-----+-----+

$2124 (W34SEL) - BG3/BG4:
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |BG4W2|BG4W2|BG4W1|BG4W1|BG3W2|BG3W2|BG3W1|BG3W1|
    |ENAB |INV  |ENAB |INV  |ENAB |INV  |ENAB |INV  |
    +-----+-----+-----+-----+-----+-----+-----+-----+

$2125 (WOBJSEL) - OBJ/Color:
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |COLW2|COLW2|COLW1|COLW1|OBJW2|OBJW2|OBJW1|OBJW1|
    |ENAB |INV  |ENAB |INV  |ENAB |INV  |ENAB |INV  |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**ENAB:** Enable window
- 0 = Window disabled for this layer
- 1 = Window enabled for this layer

**INV:** Invert window
- 0 = Use window area as-is
- 1 = Invert window area (inside becomes outside)

### $2126-$2129 - WH0-WH3 - Window Positions (W)

```
$2126 (WH0): Window 1 left position (0-255)
$2127 (WH1): Window 1 right position (0-255)
$2128 (WH2): Window 2 left position (0-255)
$2129 (WH3): Window 2 right position (0-255)
```

Defines horizontal positions for two independent windows.

### $212A-$212B - WBGLOG/WOBJLOG - Window Mask Logic (W)

```
$212A (WBGLOG) - BG Window Logic:
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | BG4 LOGIC | BG3 LOGIC | BG2 LOGIC | BG1 LOGIC |
    +-----+-----+-----+-----+-----+-----+-----+-----+

$212B (WOBJLOG) - OBJ/Color Window Logic:
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | COL LOGIC | OBJ LOGIC | -   -   -   -   |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**Logic Operations (2 bits per layer):**
- 0 = OR (Window1 OR Window2)
- 1 = AND (Window1 AND Window2)
- 2 = XOR (Window1 XOR Window2)
- 3 = XNOR (NOT (Window1 XOR Window2))

## Screen Designation Registers

### $212C-$212D - TM/TS - Main/Sub Screen Designation (W)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | -   -   -   |OBJ  |BG4  |BG3  |BG2  |BG1  |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**$212C (TM):** Main Screen
- Enable layers for main screen

**$212D (TS):** Sub Screen
- Enable layers for sub screen (used for color math)

**Layer Enable Bits:**
- Bit 4: OBJ (sprites)
- Bit 3: BG4
- Bit 2: BG3
- Bit 1: BG2
- Bit 0: BG1
- Note: Backdrop always enabled

### $212E-$212F - TMW/TSW - Window Mask Designation (W)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    | -   -   -   |OBJ  |BG4  |BG3  |BG2  |BG1  |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**$212E (TMW):** Window Mask for Main Screen
- 0 = Enable layer
- 1 = Disable layer (in window area)

**$212F (TSW):** Window Mask for Sub Screen
- 0 = Enable layer
- 1 = Disable layer (in window area)

## Multiplication Result Registers

### $2134-$2136 - MPYL/MPYM/MPYH - Multiplication Result (R)

```
$2134 (MPYL): Result low byte
$2135 (MPYM): Result middle byte
$2136 (MPYH): Result high byte
```

**24-bit signed result of:** (M7A * M7B) >> 8

Updated whenever M7A or M7B is written. Can be used for math even outside Mode 7.

**Usage:**
```
; Multiply $1234 * $0056:
LDA #$34 : STA $211B  ; M7A low
LDA #$12 : STA $211B  ; M7A high
LDA #$56 : STA $211C  ; M7B low
LDA #$00 : STA $211C  ; M7B high
; Wait a few cycles...
LDA $2134 : STA result+0  ; Result low
LDA $2135 : STA result+1  ; Result mid
LDA $2136 : STA result+2  ; Result high
```

## H/V Counter and Status Registers

### $2137 - SLHV - Software Latch H/V Counters (R)

Reading this register latches the current H/V counter values into $213C/$213D.

**Three methods to latch counters:**
1. Read from $2137 (this register)
2. Write $4201 bit 7: 1→0 transition
3. Lightgun signal (Pin 6 of controller port 2)

### $213C-$213D - OPHCT/OPVCT - H/V Counter Latches (R2)

```
Read twice for each register:
  1st read: Low 8 bits
  2nd read: High bit (bit 8), other bits are open bus
```

**$213C (OPHCT):** Horizontal Counter (0-339)
- Visible screen: H=22-277
- Hblank: H=274-339

**$213D (OPVCT):** Vertical Counter
- NTSC: 0-261 (262 possible on interlace frames)
- PAL: 0-311 (312 possible on interlace frames)
- Visible screen: V=1-224 (or V=1-239 in overscan mode)

**Note:** Reading $213F resets the 1st/2nd read flip-flops for both registers.

### $213E - STAT77 - PPU1 Status (R)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |TIMOV|RNGOV|MSLAV| (Open Bus) |    VERSION    |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**TIMOV (Bit 7):** Time Overflow
- 0 = Okay
- 1 = More than 8*34 OBJ pixels per scanline

**RNGOV (Bit 6):** Range Overflow
- 0 = Okay
- 1 = More than 32 OBJs per scanline

**MSLAV (Bit 5):** Master/Slave Mode
- 0 = Normal (master mode)
- 1 = Slave mode (PPU1 Pin 25)

**VERSION (Bits 3-0):** PPU1 Version
- Known value: 1 (5C77 version 1)

**Note:** Overflow flags cleared at end of V-Blank (not during forced blank). Flags set regardless of OBJ enable/disable in $212C.

### $213F - STAT78 - PPU2 Status (R)

```
Bit:  7     6     5     4     3     2     1     0
    +-----+-----+-----+-----+-----+-----+-----+-----+
    |INTRV|LATCH| (Open Bus) |NTPAL|    VERSION    |
    +-----+-----+-----+-----+-----+-----+-----+-----+
```

**INTRV (Bit 7):** Interlace Field
- 0 = First frame
- 1 = Second frame

**LATCH (Bit 6):** H/V Counter Latch Flag
- 0 = No new data
- 1 = New data latched (in $213C/$213D)

**NTPAL (Bit 4):** NTSC/PAL Mode
- 0 = NTSC (60Hz)
- 1 = PAL (50Hz)

**VERSION (Bits 3-0):** PPU2 Version
- Known values: 1, 2, 3 (5C78 versions 1-3)

**Note:** Reading this register also:
- Clears the latch flag (bit 6)
- Resets the 1st/2nd read flip-flops for $213C/$213D

## Implementation Notes

### VRAM Access Timing
- VRAM can be freely accessed during V-Blank or Forced Blank
- Outside these periods, access may be unreliable
- Use NMI during V-Blank for safe VRAM updates

### OAM Access Timing
- OAM can be accessed during V-Blank or Forced Blank
- May have limited windows during H-Blank (fragile timing)
- Best practice: Use DMA during V-Blank

### CGRAM Access Timing
- CGRAM can be accessed during certain H-Blank periods
- Exact timing depends on BG modes and sprite count
- Safest: Access during V-Blank or Forced Blank

### Write-Twice Registers
Many registers require two writes (marked W2):
- First write stores low byte in temporary latch
- Second write combines with latched low byte
- Reading $213F resets scroll/counter read flip-flops

### Open Bus
Some register bits return "open bus" - the last value on the data bus (usually from instruction fetch).

## References

- [Super Famicom Dev Wiki - PPU Registers](https://wiki.superfamicom.org/)
- Anomie's SNES Documents
- Fullsnes by Martin Korth (problemkaputt.de/fullsnes.htm)
- SNES Development Manual (official Nintendo documentation)
