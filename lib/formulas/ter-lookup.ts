/**
 * TER (Tarif Efektif Rata-rata) Lookup Tables
 * Source: Tarif TER.pdf (public folder)
 * Effective from January 1, 2024 (PP 58/2023)
 */

export type TERCategory = 'A' | 'B' | 'C';

interface TERBracket {
    limit: number; // Upper limit of the bracket (inclusive)
    rate: number;  // Percentage rate
}

// Category A: PTKP TK/0, TK/1, K/0 — 44 brackets
const CATEGORY_A: TERBracket[] = [
    { limit: 5400000, rate: 0 },
    { limit: 5650000, rate: 0.25 },
    { limit: 5950000, rate: 0.50 },
    { limit: 6300000, rate: 0.75 },
    { limit: 6750000, rate: 1.00 },
    { limit: 7500000, rate: 1.25 },
    { limit: 8550000, rate: 1.50 },
    { limit: 9650000, rate: 1.75 },
    { limit: 10050000, rate: 2.00 },
    { limit: 10350000, rate: 2.25 },
    { limit: 10700000, rate: 2.50 },
    { limit: 11050000, rate: 3.00 },
    { limit: 11600000, rate: 3.50 },
    { limit: 12500000, rate: 4.00 },
    { limit: 13750000, rate: 5.00 },
    { limit: 15100000, rate: 6.00 },
    { limit: 16950000, rate: 7.00 },
    { limit: 19750000, rate: 8.00 },
    { limit: 24150000, rate: 9.00 },
    { limit: 26450000, rate: 10.00 },
    { limit: 28000000, rate: 11.00 },
    { limit: 30050000, rate: 12.00 },
    { limit: 32400000, rate: 13.00 },
    { limit: 35400000, rate: 14.00 },
    { limit: 39100000, rate: 15.00 },
    { limit: 43850000, rate: 16.00 },
    { limit: 47800000, rate: 17.00 },
    { limit: 51400000, rate: 18.00 },
    { limit: 56300000, rate: 19.00 },
    { limit: 62200000, rate: 20.00 },
    { limit: 68600000, rate: 21.00 },
    { limit: 77500000, rate: 22.00 },
    { limit: 89700000, rate: 23.00 },
    { limit: 105600000, rate: 24.00 },
    { limit: 125100000, rate: 25.00 },
    { limit: 151700000, rate: 26.00 },
    { limit: 188400000, rate: 27.00 },
    { limit: 245000000, rate: 28.00 },
    { limit: 322100000, rate: 29.00 },
    { limit: 455100000, rate: 30.00 },
    { limit: 607700000, rate: 31.00 },
    { limit: 814000000, rate: 32.00 },
    { limit: 1419000000, rate: 33.00 },
    { limit: Infinity, rate: 34.00 },
];

// Category B: PTKP TK/2, TK/3, K/1, K/2 — 40 brackets
const CATEGORY_B: TERBracket[] = [
    { limit: 6200000, rate: 0 },
    { limit: 6500000, rate: 0.25 },
    { limit: 6850000, rate: 0.50 },
    { limit: 7300000, rate: 0.75 },
    { limit: 9200000, rate: 1.00 },
    { limit: 10750000, rate: 1.50 },
    { limit: 11250000, rate: 2.00 },
    { limit: 11600000, rate: 2.50 },
    { limit: 12600000, rate: 3.00 },
    { limit: 13600000, rate: 4.00 },
    { limit: 14950000, rate: 5.00 },
    { limit: 16400000, rate: 6.00 },
    { limit: 18450000, rate: 7.00 },
    { limit: 21850000, rate: 8.00 },
    { limit: 26000000, rate: 9.00 },
    { limit: 27700000, rate: 10.00 },
    { limit: 29350000, rate: 11.00 },
    { limit: 31450000, rate: 12.00 },
    { limit: 33950000, rate: 13.00 },
    { limit: 37100000, rate: 14.00 },
    { limit: 41100000, rate: 15.00 },
    { limit: 45800000, rate: 16.00 },
    { limit: 49500000, rate: 17.00 },
    { limit: 53800000, rate: 18.00 },
    { limit: 58500000, rate: 19.00 },
    { limit: 64000000, rate: 20.00 },
    { limit: 71000000, rate: 21.00 },
    { limit: 80000000, rate: 22.00 },
    { limit: 93000000, rate: 23.00 },
    { limit: 109000000, rate: 24.00 },
    { limit: 129000000, rate: 25.00 },
    { limit: 163000000, rate: 26.00 },
    { limit: 211000000, rate: 27.00 },
    { limit: 374000000, rate: 28.00 },
    { limit: 459000000, rate: 29.00 },
    { limit: 555000000, rate: 30.00 },
    { limit: 704000000, rate: 31.00 },
    { limit: 922000000, rate: 32.00 },
    { limit: 1405000000, rate: 33.00 },
    { limit: Infinity, rate: 34.00 },
];

// Category C: PTKP K/3 — 41 brackets
const CATEGORY_C: TERBracket[] = [
    { limit: 6600000, rate: 0 },
    { limit: 6950000, rate: 0.25 },
    { limit: 7350000, rate: 0.50 },
    { limit: 7800000, rate: 0.75 },
    { limit: 8850000, rate: 1.00 },
    { limit: 9800000, rate: 1.25 },
    { limit: 10950000, rate: 1.50 },
    { limit: 11200000, rate: 1.75 },
    { limit: 12050000, rate: 2.00 },
    { limit: 12950000, rate: 3.00 },
    { limit: 14150000, rate: 4.00 },
    { limit: 15550000, rate: 5.00 },
    { limit: 17050000, rate: 6.00 },
    { limit: 19500000, rate: 7.00 },
    { limit: 22700000, rate: 8.00 },
    { limit: 26600000, rate: 9.00 },
    { limit: 28100000, rate: 10.00 },
    { limit: 30100000, rate: 11.00 },
    { limit: 32600000, rate: 12.00 },
    { limit: 35400000, rate: 13.00 },
    { limit: 38900000, rate: 14.00 },
    { limit: 43000000, rate: 15.00 },
    { limit: 47400000, rate: 16.00 },
    { limit: 51200000, rate: 17.00 },
    { limit: 55800000, rate: 18.00 },
    { limit: 60400000, rate: 19.00 },
    { limit: 66700000, rate: 20.00 },
    { limit: 74500000, rate: 21.00 },
    { limit: 83200000, rate: 22.00 },
    { limit: 95600000, rate: 23.00 },
    { limit: 110000000, rate: 24.00 },
    { limit: 134000000, rate: 25.00 },
    { limit: 169000000, rate: 26.00 },
    { limit: 221000000, rate: 27.00 },
    { limit: 390000000, rate: 28.00 },
    { limit: 463000000, rate: 29.00 },
    { limit: 561000000, rate: 30.00 },
    { limit: 709000000, rate: 31.00 },
    { limit: 965000000, rate: 32.00 },
    { limit: 1419000000, rate: 33.00 },
    { limit: Infinity, rate: 34.00 },
];

/**
 * Get TER Category based on PTKP status
 */
export function getTERCategory(taxStatus: string): TERCategory {
    const status = taxStatus.toUpperCase();

    if (['TK/0', 'TK/1', 'K/0'].includes(status)) return 'A';
    if (['TK/2', 'TK/3', 'K/1', 'K/2'].includes(status)) return 'B';
    if (status === 'K/3') return 'C';

    // Default to A if unknown
    return 'A';
}

/**
 * Get TER Rate (%) based on category and monthly gross income
 */
export function getTERRate(category: TERCategory, monthlyGross: number): number {
    if (monthlyGross <= 0) return 0;

    const brackets = category === 'A' ? CATEGORY_A : category === 'B' ? CATEGORY_B : CATEGORY_C;

    const bracket = brackets.find(b => monthlyGross <= b.limit);
    return bracket ? bracket.rate : 34;
}
