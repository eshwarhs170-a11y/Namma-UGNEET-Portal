import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function CollegeTrendChart({ records, targetYear }) {
  const chartData = useMemo(() => {
    if (!records || records.length === 0) return [];

    // Filter records for the target year
    const yearRecords = records.filter(r => String(r.year) === String(targetYear));
    if (yearRecords.length === 0) return [];

    // Find the top 3 most common categories to plot to avoid a messy chart
    const categoryCounts = {};
    yearRecords.forEach(r => {
      categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
    });
    
    const topCategories = Object.keys(categoryCounts)
      .sort((a, b) => categoryCounts[b] - categoryCounts[a])
      .slice(0, 5);

    // Group by Round
    const rounds = Array.from(new Set(yearRecords.map(r => r.round))).sort();
    
    const data = rounds.map(round => {
      const point = { round };
      topCategories.forEach(cat => {
        // Find highest rank (last cutoff) for this category in this round
        const catRecords = yearRecords.filter(r => r.round === round && r.category === cat);
        if (catRecords.length > 0) {
          const maxRank = Math.max(...catRecords.map(r => r.rank));
          point[cat] = maxRank;
        } else {
          point[cat] = null; // No cutoff data for this round
        }
      });
      return point;
    });

    return data;
  }, [records, targetYear]);

  if (chartData.length <= 1) {
    return null; // Don't show chart if only 1 round of data
  }

  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div style={{ width: '100%', height: 300, marginTop: '20px', marginBottom: '20px' }}>
      <h4 style={{ marginBottom: '10px', color: 'var(--brand-deep)', fontSize: '14px' }}>Cutoff Trend Across Rounds ({targetYear})</h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="round" />
          <YAxis reversed={true} domain={['dataMin - 1000', 'dataMax + 1000']} tickFormatter={(val) => val.toLocaleString('en-IN')} width={80} />
          <Tooltip formatter={(value) => value.toLocaleString('en-IN')} labelStyle={{ color: '#1a2b4a' }} />
          <Legend />
          {Object.keys(chartData[0] || {})
            .filter(key => key !== 'round')
            .map((cat, idx) => (
              <Line 
                key={cat} 
                type="monotone" 
                dataKey={cat} 
                stroke={colors[idx % colors.length]} 
                strokeWidth={2}
                connectNulls={true}
                activeDot={{ r: 6 }} 
              />
            ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
