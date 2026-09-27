/**
 * Human chromosome 14, G-banding ideogram (hg38).
 *
 * Source: UCSC Genome Browser, track cytoBandIdeo, genome hg38, chr14
 * (api.genome.ucsc.edu/getData/track?genome=hg38;track=cytoBandIdeo;chrom=chr14),
 * fetched 2026-09-27. Band names are at 850-band resolution; at 550 bands
 * q32.11–q32.13 merge into q32.1, which is why older papers say 14q32.1.
 *
 * ATXN3: chr14:92,058,552–92,106,582 (hg38) — NCBI Gene 4287, HGNC:7106.
 */

export type Stain = 'gneg' | 'gpos25' | 'gpos50' | 'gpos75' | 'gpos100' | 'gvar' | 'stalk' | 'acen';

export interface Band {
  start: number;
  end: number;
  name: string;
  stain: Stain;
}

export const CHR14_LENGTH = 107_043_718;

export const ATXN3 = { start: 92_058_552, end: 92_106_582, band: 'q32.12' } as const;

export const CHR14_BANDS: Band[] = [
  { start: 0, end: 3_600_000, name: 'p13', stain: 'gvar' },
  { start: 3_600_000, end: 8_000_000, name: 'p12', stain: 'stalk' },
  { start: 8_000_000, end: 16_100_000, name: 'p11.2', stain: 'gvar' },
  { start: 16_100_000, end: 17_200_000, name: 'p11.1', stain: 'acen' },
  { start: 17_200_000, end: 18_200_000, name: 'q11.1', stain: 'acen' },
  { start: 18_200_000, end: 24_100_000, name: 'q11.2', stain: 'gneg' },
  { start: 24_100_000, end: 32_900_000, name: 'q12', stain: 'gpos100' },
  { start: 32_900_000, end: 34_800_000, name: 'q13.1', stain: 'gneg' },
  { start: 34_800_000, end: 36_100_000, name: 'q13.2', stain: 'gpos50' },
  { start: 36_100_000, end: 37_400_000, name: 'q13.3', stain: 'gneg' },
  { start: 37_400_000, end: 43_000_000, name: 'q21.1', stain: 'gpos100' },
  { start: 43_000_000, end: 46_700_000, name: 'q21.2', stain: 'gneg' },
  { start: 46_700_000, end: 50_400_000, name: 'q21.3', stain: 'gpos100' },
  { start: 50_400_000, end: 53_600_000, name: 'q22.1', stain: 'gneg' },
  { start: 53_600_000, end: 55_000_000, name: 'q22.2', stain: 'gpos25' },
  { start: 55_000_000, end: 57_600_000, name: 'q22.3', stain: 'gneg' },
  { start: 57_600_000, end: 61_600_000, name: 'q23.1', stain: 'gpos75' },
  { start: 61_600_000, end: 64_300_000, name: 'q23.2', stain: 'gneg' },
  { start: 64_300_000, end: 67_400_000, name: 'q23.3', stain: 'gpos50' },
  { start: 67_400_000, end: 69_800_000, name: 'q24.1', stain: 'gneg' },
  { start: 69_800_000, end: 73_300_000, name: 'q24.2', stain: 'gpos50' },
  { start: 73_300_000, end: 78_800_000, name: 'q24.3', stain: 'gneg' },
  { start: 78_800_000, end: 83_100_000, name: 'q31.1', stain: 'gpos100' },
  { start: 83_100_000, end: 84_400_000, name: 'q31.2', stain: 'gneg' },
  { start: 84_400_000, end: 89_300_000, name: 'q31.3', stain: 'gpos100' },
  { start: 89_300_000, end: 91_400_000, name: 'q32.11', stain: 'gneg' },
  { start: 91_400_000, end: 94_200_000, name: 'q32.12', stain: 'gpos25' },
  { start: 94_200_000, end: 95_800_000, name: 'q32.13', stain: 'gneg' },
  { start: 95_800_000, end: 100_900_000, name: 'q32.2', stain: 'gpos50' },
  { start: 100_900_000, end: 102_700_000, name: 'q32.31', stain: 'gneg' },
  { start: 102_700_000, end: 103_500_000, name: 'q32.32', stain: 'gpos50' },
  { start: 103_500_000, end: CHR14_LENGTH, name: 'q32.33', stain: 'gneg' },
];
