import { Decimal } from 'decimal.js';
// Mocking the PIR calculation logic from lib/formulas/kpi-calculator.ts

interface MockKPIData {
    category_style: 'activity' | 'index';
    score: number; // Volume * Tariff for activity, Volume * Index for index
    weight: number;
}

function verifyHybridRemuneration(
    allocationAmount: number,
    kpiData: MockKPIData[]
) {
    console.log(`--- Remuneration Verification ---`);
    console.log(`Total Allocation: Rp${allocationAmount.toLocaleString('id-ID')}`);

    // 1. Separate activity-based and index-based
    const activityKPIs = kpiData.filter(d => d.category_style === 'activity');
    const indexKPIs = kpiData.filter(d => d.category_style === 'index');

    // 2. Activity-based direct deduction
    const totalActivityRupiah = activityKPIs.reduce((sum, kpi) => sum + kpi.score, 0);
    console.log(`Total Activity Deduction: Rp${totalActivityRupiah.toLocaleString('id-ID')}`);

    // 3. Remaining allocation for index-based
    const remainingAllocation = allocationAmount - totalActivityRupiah;
    console.log(`Remaining Allocation for Index: Rp${remainingAllocation.toLocaleString('id-ID')}`);

    // 4. PIR Calculation
    // Total Score Index across all employees (simulating with current set)
    const totalScoreIndexAcrossEmployees = indexKPIs.reduce((sum, kpi) => sum + kpi.score, 0);
    console.log(`Total Score Index Sum: ${totalScoreIndexAcrossEmployees}`);

    const pir = remainingAllocation / totalScoreIndexAcrossEmployees;
    console.log(`PIR Value (Rp/Point): ${pir.toFixed(4)}`);

    // 5. Individual Remuneration
    const activityRemuneration = totalActivityRupiah;
    const indexRemuneration = totalScoreIndexAcrossEmployees * pir;
    const totalBruto = activityRemuneration + indexRemuneration;

    console.log(`Activity Remuneration: Rp${activityRemuneration.toLocaleString('id-ID')}`);
    console.log(`Index Remuneration: Rp${indexRemuneration.toLocaleString('id-ID')}`);
    console.log(`Total Bruto: Rp${totalBruto.toLocaleString('id-ID')}`);

    // Verification results
    const isValidBruto = Math.abs(totalBruto - allocationAmount) < 0.01;
    const isValidRemaining = Math.abs(indexRemuneration - remainingAllocation) < 0.01;

    return {
        pir,
        totalBruto,
        isValidBruto,
        isValidRemaining
    };
}

// Running Test Scenario
const testResult = verifyHybridRemuneration(10000000, [
    { category_style: 'activity', score: 2500000, weight: 0 }, // Individual Activity
    { category_style: 'index', score: 450, weight: 100 },     // Individual Index P2
    { category_style: 'index', score: 150, weight: 100 }      // Individual Index P3
]);

console.log(`\nVerification Result:`);
console.log(`Is Bruto Valid? ${testResult.isValidBruto ? '✅ YES' : '❌ NO'}`);
console.log(`Is Index Allocation Valid? ${testResult.isValidRemaining ? '✅ YES' : '❌ NO'}`);
