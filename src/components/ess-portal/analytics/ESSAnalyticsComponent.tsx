'use client';

import React, { useState } from 'react';
import { 
  Users, Clock, TrendingUp, BarChart3, 
  Calendar, Target, DollarSign, AlertTriangle
} from 'lucide-react';

// --- INTERFACES ---

interface ChartData {
  label: string;
  value: number;
  color: string;
  category?: string;
}

// --- MOCK DATA ---

// --- UTILITY COMPONENTS ---

// removed unused KPICard component

const SimpleBarChart: React.FC<{ title: string; data: ChartData[]; max: number }> = ({ title, data, max }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <BarChart3 className="w-5 h-5 mr-2 text-gray-600" />
        {title}
      </h3>
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-20 text-sm text-gray-600 font-medium">{item.label}</div>
            <div className="flex-1 mx-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="h-3 rounded-full transition-all duration-700"
                  style={{ 
                    width: `${(item.value / max) * 100}%`,
                    backgroundColor: item.color 
                  }}
                ></div>
              </div>
            </div>
            <div className="w-12 text-sm font-semibold text-gray-900">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// removed unused SimplePieChart component

// --- MAIN COMPONENT ---

const ESSAnalyticsOverview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'attrition' | 'attendance' | 'productivity'>('attrition');

  // KPI Data
  // removed unused kpis data

  // Chart Data
  // removed unused departmentData

  // removed unused requestTypeData

  const TabButton: React.FC<{ tab: 'attrition' | 'attendance' | 'productivity', label: string }> = ({ tab, label }) => {
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition duration-200 
          ${isActive 
            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
            : 'text-gray-600 hover:bg-gray-100'}`
        }
      >
        {label}
      </button>
    );
  };

  // ----- ATTRITION WIDGETS -----
  const AttritionKPI: React.FC<{ label: string; value: string; sub?: string }>=({label, value, sub})=> (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );

  // Header metrics and banners (dynamic-friendly)
  const dashboardStats = {
    totalEmployees: 125,
    attritionRate: '3.2%',
    attendanceRate: '94.8%',
    avgProductivity: '87.5%',
    totalRevenue: '₹1,11,00,L',
    highRisk: 8,
    productivityTrend: '+5.2% increase from last month',
    attendanceExcellence: 'Finance department: 96.1% attendance',
    attentionNeeded: 'Operations: Low efficiency (78.9%)'
  };

  const MetricCard: React.FC<{ icon: React.ReactNode; value: string | number; label: string }>=({icon, value, label})=> (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-extrabold text-gray-900 leading-none">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );

  const InfoBanner: React.FC<{ tone: 'success'|'info'|'warning'; title: string; desc: string; icon?: React.ReactNode }>=({tone, title, desc, icon})=>{
    const tones: Record<string, {box: string; text: string; border: string; iconBg: string; iconText: string}> = {
      success: { box:'bg-emerald-50', text:'text-emerald-800', border:'border-emerald-100', iconBg:'bg-emerald-100', iconText:'text-emerald-700' },
      info: { box:'bg-blue-50', text:'text-blue-800', border:'border-blue-100', iconBg:'bg-blue-100', iconText:'text-blue-700' },
      warning: { box:'bg-amber-50', text:'text-amber-900', border:'border-amber-100', iconBg:'bg-amber-100', iconText:'text-amber-700' }
    };
    const t = tones[tone];
    return (
      <div className={`rounded-xl ${t.box} ${t.border} border p-4 flex items-start gap-3`}>
        <div className={`w-6 h-6 rounded-lg ${t.iconBg} ${t.iconText} flex items-center justify-center`}>{icon}</div>
        <div>
          <div className={`text-sm font-semibold ${t.text}`}>{title}</div>
          <div className="text-xs text-gray-600 mt-1">{desc}</div>
        </div>
      </div>
    );
  };

  const GroupedBarChart: React.FC<{ title: string; series: { name: string; color: string; data: number[] }[]; categories: string[]; maxY: number }>=({title, series, categories, maxY})=>{
    const chartHeight = 180;
    const groupWidth = 36; // width allocated per month
    const barWidth = 8; // width per series bar
    const gap = 16; // gap between groups
    const width = categories.length * (groupWidth + gap) + 16;
    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>
        <svg width={width} height={chartHeight} className="w-full">
          {categories.map((m, idx)=>{
            const x0 = 24 + idx * (groupWidth + gap);
            return (
              <g key={m}>
                {series.map((s, sIdx)=>{
                  const v = s.data[idx] || 0;
                  const h = Math.max(2, (v / maxY) * (chartHeight - 40));
                  const x = x0 + sIdx * (barWidth + 4);
                  const y = chartHeight - 24 - h;
                  return (
                    <rect key={sIdx} x={x} y={y} width={barWidth} height={h} rx={2} fill={s.color} />
                  )
                })}
                <text x={x0 + groupWidth/2} y={chartHeight - 8} textAnchor="middle" fontSize="10" fill="#6b7280">{m}</text>
              </g>
            )
          })}
        </svg>
        <div className="flex items-center gap-4 mt-2">
          {series.map(s=> (
            <div key={s.name} className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-3 h-3 rounded-full" style={{background:s.color}}></span>
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const DonutChart: React.FC<{ title: string; data: { label: string; value: number; color: string }[] }>=({title, data})=>{
    const size = 160;
    const strokeWidth = 24;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const total = data.reduce((s,d)=> s + d.value, 0) || 1;
    let offset = 0;
    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>
        <div className="flex items-center gap-4">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle cx={size/2} cy={size/2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
            {data.map((d, i)=>{
              const pct = d.value / total;
              const dash = pct * circumference;
              const circle = (
                <circle key={i} cx={size/2} cy={size/2} r={radius} fill="none" stroke={d.color} strokeWidth={strokeWidth}
                  strokeDasharray={`${dash} ${circumference}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size/2} ${size/2})`} />
              );
              offset += dash;
              return circle;
            })}
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="fill-gray-700" fontSize="14">{total}</text>
          </svg>
          <div className="flex flex-col gap-2">
            {data.map(d=> (
              <div key={d.label} className="flex items-center gap-2 text-xs text-gray-600">
                <span className="w-3 h-3 rounded-full" style={{background:d.color}}></span>
                <span>{d.label}: <span className="font-semibold text-gray-700">{d.value}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const RecentExitsTable: React.FC<{ rows: { name: string; id: string; dept: string; tenure: string; exit: string; type: string; reason: string; notice: string; replacement: 'Yes'|'No' }[] }>=({rows})=> (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 text-left">Employee</th>
            <th className="px-4 py-3 text-left">Department</th>
            <th className="px-4 py-3 text-left">Tenure</th>
            <th className="px-4 py-3 text-left">Exit Date</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Reason</th>
            <th className="px-4 py-3 text-left">Notice Period</th>
            <th className="px-4 py-3 text-left">Replacement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, idx)=> (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{r.name}</div>
                <div className="text-xs text-gray-500">{r.id}</div>
              </td>
              <td className="px-4 py-3 text-gray-700">{r.dept}</td>
              <td className="px-4 py-3 text-gray-700">{r.tenure}</td>
              <td className="px-4 py-3 text-gray-700">{r.exit}</td>
              <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${r.type==='voluntary' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{r.type}</span></td>
              <td className="px-4 py-3 text-gray-700">{r.reason}</td>
              <td className="px-4 py-3 text-gray-700">{r.notice}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-1 rounded-full ${r.replacement==='Yes' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{r.replacement}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderAttritionContent = () => {
    // Mock data
    const monthly = {
      categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'],
      series: [
        { name: 'Total Exits', color: '#ef4444', data: [2,1,3,6,5,1,1,2,3] },
        { name: 'Voluntary', color: '#22c55e', data: [1,1,2,4,3,1,1,1,2] },
        { name: 'Involuntary', color: '#3b82f6', data: [1,0,1,2,2,0,0,1,1] },
      ],
    };
    const reasons = [
      { label: 'Better opportunity', value: 1, color: '#10b981' },
      { label: 'Career change', value: 1, color: '#3b82f6' },
      { label: 'Performance issues', value: 1, color: '#ef4444' },
      { label: 'Relocation', value: 1, color: '#f59e0b' },
    ];
    const deptRates = [
      { label: 'Engineering', value: 1, color: '#3b82f6' },
      { label: 'Medical', value: 1, color: '#10b981' },
      { label: 'Sales', value: 1, color: '#f59e0b' },
      { label: 'Finance', value: 1, color: '#ef4444' },
      { label: 'HR', value: 1, color: '#6366f1' },
      { label: 'Operations', value: 1, color: '#14b8a6' },
    ];
    const recent = [
      { name:'Amit Sharma', id:'EMP0245 • Software Engineer', dept:'Engineering', tenure:'18 months', exit:'15/09/2025', type:'voluntary', reason:'Better opportunity', notice:'60 days', replacement:'No' as const },
      { name:'Neha Gupta', id:'EMP0247 • Marketing Executive', dept:'Marketing', tenure:'24 months', exit:'20/08/2025', type:'voluntary', reason:'Career change', notice:'30 days', replacement:'Yes' as const },
      { name:'Vikash Singh', id:'EMP0259 • Sales Manager', dept:'Sales', tenure:'8 months', exit:'10/07/2025', type:'involuntary', reason:'Performance issues', notice:'0 days', replacement:'Yes' as const },
      { name:'Priya Verma', id:'EMP0289 • Accountant', dept:'Finance', tenure:'36 months', exit:'30/06/2025', type:'voluntary', reason:'Relocation', notice:'45 days', replacement:'No' as const },
    ];

    return (
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          <AttritionKPI label="Total Exits" value="4" />
          <AttritionKPI label="Attrition Rate" value="3.2%" />
          <AttritionKPI label="Voluntary" value="3" />
          <AttritionKPI label="Involuntary" value="1" />
          <AttritionKPI label="Replacement Rate" value="50%" />
          <AttritionKPI label="Avg Tenure (Mo)" value="21.5" />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GroupedBarChart title="Monthly Attrition Trends" categories={monthly.categories} series={monthly.series} maxY={8} />
          <DonutChart title="Attrition Reasons" data={reasons} />
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Department-wise Attrition Rate</h3>
            <SimpleBarChart title="" data={deptRates} max={1} />
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Attrition by Tenure</h3>
            <div className="space-y-2">
              {[
                {label:'0-6 months', count:'1 employees (25%)', risk:'high risk', color:'bg-rose-100 text-rose-700'},
                {label:'6-12 months', count:'1 employees (25%)', risk:'medium risk', color:'bg-amber-100 text-amber-700'},
                {label:'1-2 years', count:'1 employees (25%)', risk:'medium risk', color:'bg-amber-100 text-amber-700'},
                {label:'2+ years', count:'1 employees (25%)', risk:'low risk', color:'bg-emerald-100 text-emerald-700'},
              ].map((t)=> (
                <div key={t.label} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 text-gray-600">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.label}</p>
                      <p className="text-xs text-gray-500">{t.count}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${t.color}`}>{t.risk}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Exits */}
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Recent Employee Exits</h3>
          <RecentExitsTable rows={recent} />
        </div>

        {/* Summary banners */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
            <p className="font-semibold">High Risk Departments</p>
            <p className="mt-1">Finance (6.7%), Marketing (5.0%)</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-semibold">Retention Target</p>
            <p className="mt-1">Current: 90.6% | Target: 95%</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-emerald-700">
            <p className="font-semibold">Stable Departments</p>
            <p className="mt-1">HR (0%), Operations (0%)</p>
          </div>
        </div>
      </div>
    );
  };

  // removed unused renderOverviewContent

  const renderPerformanceContent = () => (
    <div className="space-y-6">
      {/* Attendance Analytics Dashboard */}
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <AttritionKPI label="Present Today" value="84" />
        <AttritionKPI label="Absent Today" value="1" />
        <AttritionKPI label="Late Arrivals" value="3" />
        <AttritionKPI label="Working Remotes" value="1" />
        <AttritionKPI label="Attendance Rate" value="80.0%" />
        <AttritionKPI label="Avg Work Hours" value="6.3h" />
      </div>

      {/* Row 1: Monthly attendance (stacked bars) + Work location donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Monthly Attendance Trends</h3>
          {/* Use grouped chart as stacked-like visualization (Present vs Absent vs Late) */}
          {(() => {
            const categories = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'];
            const series = [
              { name: 'Present', color: '#22c55e', data: [95,96,97,98,97,96,95,96,97] },
              { name: 'Remote (WFH)', color: '#60a5fa', data: [3,3,2,2,2,3,3,2,2] },
              { name: 'Absent', color: '#ef4444', data: [2,1,1,0,1,1,2,2,1] },
            ];
            const maxY = 100;
            const chartH = 180;
            const width = categories.length * 44 + 24;
            return (
              <svg width={width} height={chartH} className="w-full">
                {/* grid lines */}
                {[0,25,50,75,100].map((y) => (
                  <line key={y} x1={0} x2={width} y1={(chartH-30) - (y/maxY)*(chartH-40)} y2={(chartH-30) - (y/maxY)*(chartH-40)} stroke="#e5e7eb" strokeWidth={1} />
                ))}
                {categories.map((m, idx)=>{
                  const x0 = 24 + idx * 44;
                  let acc = 0;
                  return (
                    <g key={m}>
                      {series.map((s)=>{
                        const v = s.data[idx];
                        const h = (v/maxY)*(chartH-40);
                        const y = (chartH-30) - h - acc;
                        const rect = <rect key={s.name} x={x0} y={y} width={24} height={h} fill={s.color} rx={3} />
                        acc += h;
                        return rect;
                      })}
                      <text x={x0+12} y={chartH-10} textAnchor="middle" fontSize="10" fill="#6b7280">{m}</text>
                    </g>
                  )
                })}
              </svg>
            );
          })()}
          <div className="flex items-center gap-4 mt-2">
            {[{n:'Present',c:'#22c55e'},{n:'Remote (WFH)',c:'#60a5fa'},{n:'Absent',c:'#ef4444'}].map(l=>(
              <div key={l.n} className="flex items-center gap-2 text-xs text-gray-600"><span className="w-3 h-3 rounded-full" style={{background:l.c}}></span>{l.n}</div>
            ))}
          </div>
        </div>
        <DonutChart title="Work Location Distribution" data={[{label:'Onsite',value:68,color:'#3b82f6'},{label:'Remote (WFH)',value:25,color:'#22c55e'},{label:'Hybrid',value:7,color:'#f59e0b'}]} />
      </div>

      {/* Row 2: Daily patterns + Department attendance overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(() => {
          const data = [
            {label:'Monday',p:96,a:2,l:2},
            {label:'Tuesday',p:97,a:1,l:2},
            {label:'Wednesday',p:98,a:1,l:1},
            {label:'Thursday',p:97,a:2,l:1},
            {label:'Friday',p:95,a:3,l:2},
            {label:'Saturday',p:92,a:5,l:3},
          ];
          const maxY = 100;
          const chartH = 180;
          const width = data.length*44 + 24;
          return (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Daily Attendance Patterns</h3>
              <svg width={width} height={chartH} className="w-full">
                {data.map((d,i)=>{
                  const x0 = 24 + i * 44;
                  const bars = [
                    {v:d.p,c:'#22c55e'},
                    {v:d.a,c:'#ef4444'},
                    {v:d.l,c:'#f59e0b'},
                  ];
                  return (
                    <g key={d.label}>
                      {bars.map((b,bi)=>{
                        const h = (b.v/maxY)*(chartH-40);
                        const y = (chartH-30) - h;
                        return <rect key={bi} x={x0 + bi*10} y={y} width={8} height={h} rx={2} fill={b.c} />
                      })}
                      <text x={x0+12} y={chartH-10} textAnchor="middle" fontSize="10" fill="#6b7280">{d.label.substring(0,3)}</text>
                    </g>
                  )
                })}
              </svg>
              <div className="flex items-center gap-4 mt-2">
                {[{n:'Present',c:'#22c55e'},{n:'Absent',c:'#ef4444'},{n:'Late',c:'#f59e0b'}].map(l=>(
                  <div key={l.n} className="flex items-center gap-2 text-xs text-gray-600"><span className="w-3 h-3 rounded-full" style={{background:l.c}}></span>{l.n}</div>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Department Attendance Overview</h3>
          <GroupedBarChart title="" categories={["Engineering","Marketing","Sales","Finance","HR","Operations"]} maxY={100} series={[{name:'Attendance %',color:'#3b82f6',data:[94,93,91,90,92,90]}]} />
        </div>
      </div>

      {/* Row 3: In-Remote vs On-site Trends */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">In-Remote vs On-site Trends</h3>
        {(() => {
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'];
          const onsite = [95,92,90,88,87,89,90,91,90];
          const remote = [15,18,22,25,27,28,29,30,32];
          const maxY = 100;
          const chartH = 200;
          const width = months.length * 64 + 24;
          return (
            <svg width={width} height={chartH} className="w-full">
              {[0,25,50,75,100].map((y)=>(
                <line key={y} x1={0} x2={width} y1={(chartH-30)-(y/maxY)*(chartH-40)} y2={(chartH-30)-(y/maxY)*(chartH-40)} stroke="#e5e7eb" />
              ))}
              {['remote','onsite'].map((key)=>{
                const data = key==='remote'? remote : onsite;
                const color = key==='remote'? '#22c55e':'#3b82f6';
                let prev = {x:24, y:(chartH-30)-(data[0]/maxY)*(chartH-40)};
                const lines = [] as React.ReactNode[];
                for(let i=1;i<data.length;i++){
                  const x = 24 + i * 64;
                  const y = (chartH-30)-(data[i]/maxY)*(chartH-40);
                  lines.push(<line key={`${key}-${i}`} x1={prev.x} y1={prev.y} x2={x} y2={y} stroke={color} strokeWidth={2} />);
                  prev = {x,y};
                }
                return <g key={key}>{lines}</g>
              })}
              {months.map((m,i)=> (
                <text key={m} x={24 + i*64} y={chartH-10} textAnchor="middle" fontSize="10" fill="#6b7280">{m}</text>
              ))}
            </svg>
          );
        })()}
        <div className="flex items-center gap-4 mt-2">
          {[{n:'On-site',c:'#3b82f6'},{n:'Remote',c:'#22c55e'}].map(l=>(
            <div key={l.n} className="flex items-center gap-2 text-xs text-gray-600"><span className="w-3 h-3 rounded-full" style={{background:l.c}}></span>{l.n}</div>
          ))}
        </div>
      </div>

      {/* Department snapshots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[{dept:'Engineering', avg:'94.2%', late:'2.1%', wfh:'35.4%', perfect:12},{dept:'Marketing', avg:'93.1%', late:'2.4%', wfh:'28.1%', perfect:6},{dept:'Sales', avg:'91.8%', late:'3.1%', wfh:'13.4%', perfect:4}].map((d)=> (
          <div key={d.dept} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">{d.dept}</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>Avg Presence:</div><div className="text-gray-900 font-medium">{d.avg}</div>
              <div>Late Comers:</div><div className="text-gray-900 font-medium">{d.late}</div>
              <div>WFH Usage:</div><div className="text-gray-900 font-medium">{d.wfh}</div>
              <div>Perfect Attendance:</div><div className="text-gray-900 font-medium">{d.perfect}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Today's Attendance Overview */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Today&apos;s Attendance Overview</h3>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Clock In</th>
                <th className="px-4 py-3 text-left">Clock Out</th>
                <th className="px-4 py-3 text-left">Work Hours</th>
                <th className="px-4 py-3 text-left">Location</th>
                <th className="px-4 py-3 text-left">Late By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                {name:'Tushar Baranwal', id:'EMP0234', dept:'Engineering', status:'present', in:'09:05', out:'18:02', wh:'8.9h', loc:'Onsite', late:'5 min'},
                {name:'Priya Sharma', id:'EMP0235', dept:'Design', status:'present', in:'09:11', out:'17:58', wh:'8.1h', loc:'WFH', late:'11 min'},
                {name:'Neha Kumar', id:'EMP0247', dept:'Engineering', status:'half-day', in:'10:32', out:'14:03', wh:'4.6h', loc:'Onsite', late:'30 min'},
                {name:'Rahul Verma', id:'EMP0240', dept:'Finance', status:'present', in:'09:01', out:'18:10', wh:'9.2h', loc:'Onsite', late:'1 min'},
                {name:'Vikash Singh', id:'EMP0259', dept:'Sales', status:'present', in:'09:15', out:'18:05', wh:'8.3h', loc:'WFH', late:'15 min'},
              ].map((r,idx)=> (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.name}</div>
                    <div className="text-xs text-gray-500">{r.id}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.dept}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${r.status==='present' ? 'bg-emerald-100 text-emerald-700' : r.status==='half-day' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>{r.status}</span></td>
                  <td className="px-4 py-3 text-gray-700">{r.in}</td>
                  <td className="px-4 py-3 text-gray-700">{r.out}</td>
                  <td className="px-4 py-3 text-gray-700">{r.wh}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${r.loc==='Onsite' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>{r.loc}</span></td>
                  <td className="px-4 py-3 text-gray-700">{r.late}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Late Arrival Analysis */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
        {[{t:'Avg Late (min)',v:'45'},{t:'Employees',v:'15'},{t:'Severe (>30m)',v:'7'},{t:'Low (<10m)',v:'2'}].map((c)=> (
          <div key={c.t} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
            <p className="text-xs text-gray-500">{c.t}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{c.v}</p>
          </div>
        ))}
      </div>
    </div>
  );

  // ---------- Productivity (Trends) ----------
  const LineChartSimple: React.FC<{ title: string; data: number[]; categories: string[]; color: string; maxY: number }> = ({ title, data, categories, color, maxY }) => {
    const chartH = 180;
    const width = categories.length * 56 + 24;
    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>
        <svg width={width} height={chartH} className="w-full">
          {[0,25,50,75,100].map((y)=>(
            <line key={y} x1={0} x2={width} y1={(chartH-30)-(y/maxY)*(chartH-40)} y2={(chartH-30)-(y/maxY)*(chartH-40)} stroke="#e5e7eb" />
          ))}
          {data.map((v, i) => {
            if (i === 0) return null;
            const x1 = 24 + (i - 1) * 56;
            const y1 = (chartH - 30) - (data[i - 1] / maxY) * (chartH - 40);
            const x2 = 24 + i * 56;
            const y2 = (chartH - 30) - (v / maxY) * (chartH - 40);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2} />;
          })}
          {categories.map((m,i)=>(
            <text key={m} x={24 + i*56} y={chartH-10} textAnchor="middle" fontSize="10" fill="#6b7280">{m}</text>
          ))}
        </svg>
      </div>
    );
  };

  const RadarChartSimple: React.FC<{ title: string; axes: string[]; values: number[] }>=({ title, axes, values })=>{
    const size = 220;
    const cx = size/2, cy = size/2; const r = 80; const max=100;
    const points = values.map((v,i)=>{
      const angle = (Math.PI*2 * i)/axes.length - Math.PI/2;
      const rr = (v/max)*r;
      return `${cx + rr*Math.cos(angle)},${cy + rr*Math.sin(angle)}`;
    }).join(' ');
    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">{title}</h3>
        <svg width={size} height={size} className="mx-auto">
          {[0.25,0.5,0.75,1].map((t,idx)=> (
            <polygon key={idx} points={axes.map((_,i)=>{
              const a=(Math.PI*2*i)/axes.length - Math.PI/2; const rr=t*r; return `${cx+rr*Math.cos(a)},${cy+rr*Math.sin(a)}`;
            }).join(' ')} fill="none" stroke="#e5e7eb" />
          ))}
          <polygon points={points} fill="#60a5fa22" stroke="#60a5fa" />
        </svg>
      </div>
    );
  };

  const StatRow: React.FC<{ left: React.ReactNode; right: React.ReactNode }>=({left, right})=> (
    <div className="flex items-center justify-between py-2 text-sm border-b last:border-b-0">
      <div className="text-gray-700">{left}</div>
      <div className="font-semibold text-gray-900">{right}</div>
    </div>
  );

  const renderTrendsContent = () => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'];
    const productivityLine = [78,81,83,85,86,87,88,89,90];
    // removed unused scoreDistribution
    const teamEfficiency = [92,90,89,88,87,86,85,84];
    const taskCompletion = [85,82,80,84];
    const radarAxes = ['Engineering','Sales','Marketing','Finance','HR'];
    const radarValues = [82,78,75,80,79];
    const topPerformers = [
      {name:'Vivek Singh', status:'Gold'},
      {name:'Tushar Baranwal', status:'Gold'},
      {name:'Priya Verma', status:'Silver'},
      {name:'Neha Gupta', status:'Silver'},
      {name:'Amit Singh', status:'Bronze'},
    ];
    const topRevenue = [
      {name:'Vivek Singh', amount:'₹1,20,000'},
      {name:'Vishal Singh', amount:'₹1,05,000'},
      {name:'Tushar Baranwal', amount:'₹98,500'},
      {name:'Priya Verma', amount:'₹91,300'},
      {name:'Amit Singh', amount:'₹88,100'},
    ];
    const deptOverview = [
      { dept:'Engineering', targets:95, completed:88, availability:'91.2%', efficiency:'87.6%', tasks:'425', revenue:'₹7,85,000', avgTime:'13.6h' },
      { dept:'Sales', targets:85, completed:78, availability:'89.4%', efficiency:'83.2%', tasks:'311', revenue:'₹6,10,000', avgTime:'10.2h' },
      { dept:'Marketing', targets:82, completed:76, availability:'92.1%', efficiency:'81.5%', tasks:'287', revenue:'₹5,43,000', avgTime:'12.4h' },
    ];
    const individualMetrics = [
      { emp:'Vivek Singh', completed:45, workHours:'180h', performance:'98%', efficiency:'92%', revenue:'₹1,20,000', overdue:'2' },
      { emp:'Tushar Baranwal', completed:42, workHours:'172h', performance:'96%', efficiency:'90%', revenue:'₹98,500', overdue:'3' },
      { emp:'Priya Verma', completed:38, workHours:'168h', performance:'94%', efficiency:'88%', revenue:'₹91,300', overdue:'4' },
    ];

    return (
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <AttritionKPI label="Avg Productivity" value="89.5%" />
          <AttritionKPI label="Avg Efficiency" value="84.5%" />
          <AttritionKPI label="Total Tasks" value="308" />
          <AttritionKPI label="Avg Task/hr" value="8.0" />
          <AttritionKPI label="Total Revenue" value="₹11.8L" />
          <AttritionKPI label="Active Employees" value="125" />
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <LineChartSimple title="Monthly Productivity Trends" data={productivityLine} categories={months} color="#22c55e" maxY={100} />
          <DonutChart title="Performance Score Distribution" data={[
            {label:'A (28%)', value:28, color:'#22c55e'},
            {label:'B (22%)', value:22, color:'#60a5fa'},
            {label:'C (18%)', value:18, color:'#f59e0b'},
            {label:'D (17%)', value:17, color:'#ef4444'},
            {label:'E (15%)', value:15, color:'#8b5cf6'},
          ]} />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Team Efficiency</h3>
            <SimpleBarChart title="" data={['Team A','Team B','Team C','Team D','Team E','Team F','Team G','Team H'].map((t,i)=>({label:t, value:teamEfficiency[i], color:'#3b82f6'}))} max={100} />
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Task Completion by Quarter</h3>
            <SimpleBarChart title="" data={['Q1','Q2','Q3','Q4'].map((q,i)=>({label:q, value:taskCompletion[i], color:'#22c55e'}))} max={100} />
          </div>
        </div>

        {/* Radar */}
        <RadarChartSimple title="Department Performance Radar" axes={radarAxes} values={radarValues} />

        {/* Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Top Performers</h3>
            <div className="divide-y">
              {topPerformers.map((p)=> (
                <StatRow key={p.name} left={<span>{p.name}</span>} right={<span className={`text-xs px-2 py-1 rounded-full ${p.status==='Gold'?'bg-yellow-100 text-yellow-700':p.status==='Silver'?'bg-gray-100 text-gray-700':'bg-amber-100 text-amber-700'}`}>{p.status}</span>} />
              ))}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Top Revenue Contributors</h3>
            <div className="divide-y">
              {topRevenue.map((p)=> (
                <StatRow key={p.name} left={<span>{p.name}</span>} right={<span>{p.amount}</span>} />
              ))}
            </div>
          </div>
        </div>

        {/* Department Overview Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Targets</th>
                <th className="px-4 py-3 text-left">Task Completed</th>
                <th className="px-4 py-3 text-left">Availability</th>
                <th className="px-4 py-3 text-left">Efficiency</th>
                <th className="px-4 py-3 text-left">Tasks</th>
                <th className="px-4 py-3 text-left">Revenue Contribution</th>
                <th className="px-4 py-3 text-left">Avg. Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deptOverview.map((d)=> (
                <tr key={d.dept} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{d.dept}</td>
                  <td className="px-4 py-3">{d.targets}</td>
                  <td className="px-4 py-3">{d.completed}</td>
                  <td className="px-4 py-3">{d.availability}</td>
                  <td className="px-4 py-3">{d.efficiency}</td>
                  <td className="px-4 py-3">{d.tasks}</td>
                  <td className="px-4 py-3">{d.revenue}</td>
                  <td className="px-4 py-3">{d.avgTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Individual Employee Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Task Completed</th>
                <th className="px-4 py-3 text-left">Work Hours</th>
                <th className="px-4 py-3 text-left">Performance Score</th>
                <th className="px-4 py-3 text-left">Efficiency</th>
                <th className="px-4 py-3 text-left">Revenue Contribution</th>
                <th className="px-4 py-3 text-left">Overdue Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {individualMetrics.map((r)=> (
                <tr key={r.emp} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{r.emp}</td>
                  <td className="px-4 py-3">{r.completed}</td>
                  <td className="px-4 py-3">{r.workHours}</td>
                  <td className="px-4 py-3">{r.performance}</td>
                  <td className="px-4 py-3">{r.efficiency}</td>
                  <td className="px-4 py-3">{r.revenue}</td>
                  <td className="px-4 py-3">{r.overdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-['Inter',sans-serif]">
      <div className="max-w-7xl mx-auto">
        
        <header className="flex mb-6">
          <div className="text-center">
            <div className="flex mb-2">
              <BarChart3 className="w-6 h-6 text-gray-700 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            </div>
            <p className="text-gray-500">Comprehensive analytics and insights for Employee Self Service</p>
          </div>
        </header>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-4">
          <MetricCard icon={<Users className="w-5 h-5" />} value={dashboardStats.totalEmployees} label="Total Employees" />
          <MetricCard icon={<TrendingUp className="w-5 h-5" />} value={dashboardStats.attritionRate} label="Attrition Rate" />
          <MetricCard icon={<Clock className="w-5 h-5" />} value={dashboardStats.attendanceRate} label="Attendance Rate" />
          <MetricCard icon={<Target className="w-5 h-5" />} value={dashboardStats.avgProductivity} label="Avg Productivity" />
          <MetricCard icon={<DollarSign className="w-5 h-5" />} value={dashboardStats.totalRevenue} label="Total Revenue" />
          <MetricCard icon={<AlertTriangle className="w-5 h-5" />} value={dashboardStats.highRisk} label="High Risk" />
        </div>

        {/* Banners Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <InfoBanner tone="success" title="Productivity Trend" desc={dashboardStats.productivityTrend} icon={<TrendingUp className="w-4 h-4" />} />
          <InfoBanner tone="info" title="Attendance Excellence" desc={dashboardStats.attendanceExcellence} icon={<Clock className="w-4 h-4" />} />
          <InfoBanner tone="warning" title="Attention Needed" desc={dashboardStats.attentionNeeded} icon={<AlertTriangle className="w-4 h-4" />} />
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-gray-200 mb-6">
          <TabButton tab="attrition" label="Attrition" />
          <TabButton tab="attendance" label="Attendance" />
          <TabButton tab="productivity" label="Productivity" />
        </div>

        {/* Content Area */}
        <div className="pt-4">
          {activeTab === 'attrition' && renderAttritionContent()}
          {activeTab === 'attendance' && renderPerformanceContent()}
          {activeTab === 'productivity' && renderTrendsContent()}
        </div>
      </div>
    </div>
  );
};

export default ESSAnalyticsOverview;



