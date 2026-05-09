import { getTERCategory, getTERRate } from '../lib/formulas/ter-lookup';
import { calculatePPh21TER } from '../lib/formulas/kpi-calculator';

function test() {
    console.log('--- TER Tax Verification (from Tarif TER.pdf) ---');

    const testCases = [
        // Category A
        { name: 'Cat A - TK/0 - 5jt (0%)', status: 'TK/0', gross: 5000000, expectedRate: 0 },
        { name: 'Cat A - TK/0 - 6jt (0.75%)', status: 'TK/0', gross: 6000000, expectedRate: 0.75 },
        { name: 'Cat A - K/0 - 10jt (2%)', status: 'K/0', gross: 10000000, expectedRate: 2.00 },
        { name: 'Cat A - TK/1 - 10.1jt (2.25%)', status: 'TK/1', gross: 10100000, expectedRate: 2.25 },
        { name: 'Cat A - TK/0 - 11jt (3%)', status: 'TK/0', gross: 11000000, expectedRate: 3.00 },
        { name: 'Cat A - TK/0 - 12jt (4%)', status: 'TK/0', gross: 12000000, expectedRate: 4.00 },
        { name: 'Cat A - TK/0 - 13jt (5%)', status: 'TK/0', gross: 13000000, expectedRate: 5.00 },

        // Category B
        { name: 'Cat B - K/1 - 6jt (0%)', status: 'K/1', gross: 6000000, expectedRate: 0 },
        { name: 'Cat B - K/1 - 7jt (0.75%)', status: 'K/1', gross: 7000000, expectedRate: 0.75 },
        { name: 'Cat B - K/2 - 9jt (1%)', status: 'K/2', gross: 9000000, expectedRate: 1.00 },
        { name: 'Cat B - TK/2 - 11jt (2%)', status: 'TK/2', gross: 11000000, expectedRate: 2.00 },

        // Category C
        { name: 'Cat C - K/3 - 6.5jt (0%)', status: 'K/3', gross: 6500000, expectedRate: 0 },
        { name: 'Cat C - K/3 - 7jt (0.5%)', status: 'K/3', gross: 7000000, expectedRate: 0.50 },
        { name: 'Cat C - K/3 - 8jt (1%)', status: 'K/3', gross: 8000000, expectedRate: 1.00 },
        { name: 'Cat C - K/3 - 12jt (2%)', status: 'K/3', gross: 12000000, expectedRate: 2.00 },
        { name: 'Cat C - K/3 - 13jt (4%)', status: 'K/3', gross: 13000000, expectedRate: 4.00 },
    ];

    let passed = 0;

    testCases.forEach(tc => {
        const category = getTERCategory(tc.status);
        const rate = getTERRate(category, tc.gross);
        const tax = calculatePPh21TER(tc.gross, tc.status);
        const expectedTax = (tc.gross * tc.expectedRate / 100);

        console.log(`\nTest: ${tc.name}`);
        console.log(`  Category: ${category} | Gross: ${tc.gross.toLocaleString()}`);
        console.log(`  Rate: ${rate}% (Expected: ${tc.expectedRate}%)`);
        console.log(`  Tax: Rp ${tax.toNumber().toLocaleString()} (Expected: Rp ${expectedTax.toLocaleString()})`);

        if (rate === tc.expectedRate) {
            console.log('  ✅ PASSED');
            passed++;
        } else {
            console.log('  ❌ FAILED');
        }
    });

    console.log(`\n--- Result: ${passed}/${testCases.length} Passed ---`);
}

test();
