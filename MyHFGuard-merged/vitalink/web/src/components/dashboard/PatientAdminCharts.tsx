import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { format, parseISO } from "date-fns";

interface Props {
    vitals: {
        hr?: Array<{ time: string; min: number; avg: number; max: number }>;
        spo2?: Array<{ time: string; min: number; avg: number; max: number }>;
        steps?: Array<{ time: string; count: number }>;
        bp?: Array<{ time: string; systolic: number; diastolic: number; pulse: number }>;
    };
    period?: string;
}

export default function PatientAdminCharts({ vitals }: Props) {
    // Transform data for charts
    // The API returns 'time' as ISO string or date string depending on query.
    // specific formatting helpers
    const formatDateLabel = (t: string) => {
        try {
            const d = new Date(t);
            // If invalid date, return as is
            if (isNaN(d.getTime())) return t;
            return format(d, 'MMM d');
        } catch {
            return t;
        }
    };

    const formatTimeLabel = (t: string) => {
        try {
            const d = new Date(t);
            if (isNaN(d.getTime())) return t;
            return format(d, 'MMM d h:mm a');
        } catch {
            return t;
        }
    }

    const hrData = (vitals.hr || []).map(r => ({
        ...r,
        date: formatDateLabel(r.time)
    }));

    const spo2Data = (vitals.spo2 || []).map(r => ({
        ...r,
        date: formatDateLabel(r.time)
    }));

    const stepsData = (vitals.steps || []).map(r => ({
        ...r,
        date: formatDateLabel(r.time)
    }));

    const bpData = (vitals.bp || []).map(r => ({
        ...r,
        timeLabel: formatTimeLabel(r.time)
    }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* 1. Steps Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Daily Steps</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stepsData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    labelStyle={{ color: '#1e293b', fontWeight: 'bold', marginBottom: '4px' }}
                                    cursor={{ fill: '#f4f4f5' }}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Steps" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* 2. Heart Rate Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Heart Rate (BPM)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={hrData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis domain={[40, 180]} fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    labelStyle={{ color: '#1e293b', fontWeight: 'bold', marginBottom: '4px' }}
                                />
                                <Legend />
                                <Line type="linear" dataKey="max" stroke="#ef4444" strokeWidth={2} dot={false} name="Max" connectNulls />
                                <Line type="linear" dataKey="avg" stroke="#f97316" strokeWidth={2} dot={false} name="Avg" connectNulls />
                                <Line type="linear" dataKey="min" stroke="#22c55e" strokeWidth={2} dot={false} name="Min" connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* 3. Blood Pressure Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Blood Pressure</CardTitle>
                </CardHeader>
                <CardContent>
                    {bpData.length === 0 ? (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                            No data available for this period
                        </div>
                    ) : (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={bpData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="timeLabel" fontSize={10} tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={50} />
                                    <YAxis domain={[40, 200]} fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        labelStyle={{ color: '#1e293b', fontWeight: 'bold', marginBottom: '4px' }}
                                    />
                                    <Legend verticalAlign="top" />
                                    <ReferenceLine y={120} label="Sys Limit" stroke="red" strokeDasharray="3 3" />
                                    <ReferenceLine y={80} label="Dia Limit" stroke="gray" strokeDasharray="3 3" />
                                    <Line type="linear" dataKey="systolic" stroke="#8884d8" strokeWidth={3} name="Systolic" />
                                    <Line type="linear" dataKey="diastolic" stroke="#82ca9d" strokeWidth={3} name="Diastolic" />
                                    <Line type="linear" dataKey="pulse" stroke="#ffc658" strokeWidth={3} name="Pulse" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 4. SpO2 Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>SpO2 (%)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={spo2Data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis domain={[80, 100]} fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    labelStyle={{ color: '#1e293b', fontWeight: 'bold', marginBottom: '4px' }}
                                />
                                <Line type="linear" dataKey="avg" stroke="#06b6d4" strokeWidth={3} activeDot={{ r: 8 }} name="Avg %" connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
