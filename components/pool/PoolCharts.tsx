'use client'

import { useMemo } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'

interface RevenueData {
    category: string
    amount: number
    patient_count?: number
}

interface TrendData {
    period: string
    revenue: number
}

interface PoolChartsProps {
    revenueData: RevenueData[]
    trendData: TrendData[]
    selectedPeriod: string
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function PoolCharts({ revenueData, trendData, selectedPeriod }: PoolChartsProps) {
    const pieData = useMemo(() => {
        return revenueData.map(item => ({
            name: item.category || 'Lainnya',
            value: item.amount
        }))
    }, [revenueData])

    const totalRevenue = useMemo(() => {
        return revenueData.reduce((sum, item) => sum + item.amount, 0)
    }, [revenueData])

    return (
        <div className="space-y-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Revenue Breakdown Pie Chart */}
                <Card className="border-slate-100 shadow-sm rounded-[1.5rem] overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-slate-800">Komposisi Pendapatan</CardTitle>
                        <CardDescription>Berdasarkan Kategori ({selectedPeriod})</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {revenueData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm italic">
                                Tidak ada data pendapatan untuk periode ini
                            </div>
                        )}
                    </CardContent>
                    {totalRevenue > 0 && (
                        <div className="px-6 pb-4 flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-500">
                            <span>Total Pendapatan</span>
                            <span className="text-blue-600">{formatCurrency(totalRevenue)}</span>
                        </div>
                    )}
                </Card>

                {/* Patient Count Bar Chart */}
                <Card className="border-slate-100 shadow-sm rounded-[1.5rem] overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-bold text-slate-800">Rincian Jumlah Pasien</CardTitle>
                        <CardDescription>Berdasarkan Kategori Layanan</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] pt-4">
                        {revenueData.some(d => (d.patient_count || 0) > 0) ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={revenueData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="patient_count" name="Jumlah Pasien" radius={[6, 6, 0, 0]}>
                                        {revenueData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm italic">
                                Belum ada data jumlah pasien
                            </div>
                        )}
                    </CardContent>
                    <div className="px-6 pb-4 flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-500">
                        <span>Layanan Terpadu</span>
                        <span className="text-emerald-600">Terverifikasi</span>
                    </div>
                </Card>
            </div>

            {/* Monthly Trend Area Chart */}
            <Card className="border-slate-100 shadow-sm rounded-[1.5rem] overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold text-slate-800">Tren Pendapatan Bulanan</CardTitle>
                    <CardDescription>Analisis 6 Bulan Terakhir</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="period"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                                tickFormatter={(value) => `Rp${value / 1000000}jt`}
                            />
                            <Tooltip
                                formatter={(value: number) => formatCurrency(value)}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#3b82f6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRev)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    )
}
