import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  BanknotesIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Appointment {
  _id: string;
  patientName: string;
  patientContact?: string;
  date: string;
  time: string;
  status: "booked" | "in_session" | "completed" | "cancelled";
  queueNumber: number;
  cancellationReason?: string;
  cancelledBy?: 'patient' | 'doctor';
  createdAt?: string;
}

interface ReportData {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  bookedAppointments: number;
  totalPatients: number;
  newPatients: number;
  completionRate: number;
  cancellationRate: number;
  averageAppointmentsPerDay: number;
  estimatedRevenue: number;
  peakDay: string;
  peakHour: string;
}

type ReportType = 'overview' | 'appointments' | 'patients' | 'revenue' | 'cancellations' | 'trends';
type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'custom';

const DoctorReports: React.FC = () => {
  const { user } = useAuth();
  const [activeReport, setActiveReport] = useState<ReportType>('overview');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData>({
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    bookedAppointments: 0,
    totalPatients: 0,
    newPatients: 0,
    completionRate: 0,
    cancellationRate: 0,
    averageAppointmentsPerDay: 0,
    estimatedRevenue: 0,
    peakDay: 'N/A',
    peakHour: 'N/A',
  });

  useEffect(() => {
    if (user?.id) {
      fetchReportData();
    }
  }, [user?.id, dateRange, customStartDate, customEndDate]);

  const getDateRangeFilter = () => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date = today;

    switch (dateRange) {
      case 'week':
        startDate = subDays(today, 7);
        break;
      case 'month':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case 'quarter':
        startDate = subDays(today, 90);
        break;
      case 'year':
        startDate = subDays(today, 365);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        } else {
          startDate = subDays(today, 30);
        }
        break;
      default:
        startDate = subDays(today, 30);
    }

    return { startDate, endDate };
  };

  const fetchReportData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/appointment/doctor/${user.id}`);
      const allAppointments: Appointment[] = response.data.appointments || response.data.data || [];
      
      // Filter by date range
      const { startDate, endDate } = getDateRangeFilter();
      const filteredAppointments = allAppointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= startDate && aptDate <= endDate;
      });
      
      setAppointments(filteredAppointments);
      await calculateReportData(filteredAppointments, startDate, endDate);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateReportData = async (appointments: Appointment[], startDate: Date, endDate: Date) => {
    const total = appointments.length;
    const completed = appointments.filter(apt => apt.status === 'completed').length;
    const cancelled = appointments.filter(apt => apt.status === 'cancelled').length;
    const booked = appointments.filter(apt => apt.status === 'booked').length;
    
    // Unique patients
    const uniquePatients = new Set(appointments.map(apt => apt.patientName));
    const totalPatients = uniquePatients.size;
    
    // Calculate new patients (first-time visitors within this period)
    const patientFirstVisit = new Map<string, string>();
    appointments.forEach(apt => {
      const existing = patientFirstVisit.get(apt.patientName);
      if (!existing || apt.date < existing) {
        patientFirstVisit.set(apt.patientName, apt.date);
      }
    });
    const newPatients = Array.from(patientFirstVisit.values()).filter(date => {
      const visitDate = new Date(date);
      return visitDate >= startDate && visitDate <= endDate;
    }).length;
    
    // Rates
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0;
    
    // Average per day
    const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const averageAppointmentsPerDay = total / daysDiff;
    
    // Get real revenue from diagnosis API
    let estimatedRevenue = 0;
    try {
      console.log(`Doctor fetching revenue for date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
      const { getRevenueStats } = await import('../../services/diagnosis.api');
      const revenueStats = await getRevenueStats({
        doctorId: user?.id,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      });
      console.log('Doctor revenue stats received:', revenueStats);
      estimatedRevenue = revenueStats.totalRevenue;
      console.log('Doctor estimated revenue:', estimatedRevenue);
    } catch (error) {
      console.error('Error fetching revenue stats:', error);
      // Fallback to estimated revenue if diagnosis data not available
      estimatedRevenue = completed * 3000; // 1000 registration + ~2000 average doctor fee
      console.log('Using fallback doctor revenue:', estimatedRevenue);
    }
    
    // Peak day
    const dayFrequency: Record<string, number> = {};
    appointments.forEach(apt => {
      const dayName = format(new Date(apt.date), 'EEEE');
      dayFrequency[dayName] = (dayFrequency[dayName] || 0) + 1;
    });
    const peakDay = Object.entries(dayFrequency).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
    
    // Peak hour
    const hourFrequency: Record<string, number> = {};
    appointments.forEach(apt => {
      if (apt.time) {
        const hour = apt.time.split(':')[0];
        hourFrequency[hour] = (hourFrequency[hour] || 0) + 1;
      }
    });
    const peakHourNum = Object.entries(hourFrequency).sort(([,a], [,b]) => b - a)[0]?.[0];
    const peakHour = peakHourNum ? `${peakHourNum}:00` : 'N/A';
    
    setReportData({
      totalAppointments: total,
      completedAppointments: completed,
      cancelledAppointments: cancelled,
      bookedAppointments: booked,
      totalPatients,
      newPatients,
      completionRate,
      cancellationRate,
      averageAppointmentsPerDay,
      estimatedRevenue,
      peakDay,
      peakHour,
    });
  };

  const exportToPDF = () => {
    const { startDate, endDate } = getDateRangeFilter();
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235); // Blue color
    doc.text('Medical Practice Report', 105, 20, { align: 'center' });
    
    // Add subtitle info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Doctor: ${user?.name || 'N/A'}`, 105, 30, { align: 'center' });
    doc.text(`Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`, 105, 36, { align: 'center' });
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 105, 42, { align: 'center' });
    
    // Add horizontal line
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(20, 46, 190, 46);
    
    let yPosition = 55;
    
    // Key Metrics Section
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Key Performance Metrics', 20, yPosition);
    yPosition += 8;
    
    const metrics = [
      ['Total Appointments', reportData.totalAppointments.toString()],
      ['Completed Appointments', reportData.completedAppointments.toString()],
      ['Cancelled Appointments', reportData.cancelledAppointments.toString()],
      ['Total Patients', reportData.totalPatients.toString()],
      ['New Patients', reportData.newPatients.toString()],
      ['Total Revenue', `LKR ${reportData.estimatedRevenue.toLocaleString()}`],
      ['Completion Rate', `${reportData.completionRate.toFixed(1)}%`],
      ['Cancellation Rate', `${reportData.cancellationRate.toFixed(1)}%`],
      ['Avg Appointments/Day', reportData.averageAppointmentsPerDay.toFixed(1)],
      ['Peak Day', reportData.peakDay],
      ['Peak Hour', reportData.peakHour],
    ];
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: metrics,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 70, halign: 'right', fontStyle: 'bold' }
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Appointment Details Section
    doc.setFontSize(14);
    doc.text('Appointment Details', 20, yPosition);
    yPosition += 8;
    
    const appointmentRows = appointments.slice(0, 100).map(apt => [
      format(new Date(apt.date), 'MMM dd, yyyy'),
      apt.time,
      apt.patientName,
      apt.queueNumber.toString(),
      apt.status.replace('_', ' '),
      apt.patientContact || 'N/A'
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Time', 'Patient', 'Queue #', 'Status', 'Contact']],
      body: appointmentRows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 20 },
        2: { cellWidth: 45 },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 28 },
        5: { cellWidth: 30 }
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Revenue Analysis Section
    doc.setFontSize(14);
    doc.text('Revenue Analysis', 20, yPosition);
    yPosition += 8;
    
    const revenueRows = [
      ['Revenue from Completed Appointments', `LKR ${reportData.estimatedRevenue.toLocaleString()}`],
      ['Lost Due to Cancellations', `-LKR ${(reportData.cancelledAppointments * 3000).toLocaleString()}`],
      ['Potential if All Completed', `LKR ${(reportData.totalAppointments * 3000).toLocaleString()}`],
    ];
    
    autoTable(doc, {
      startY: yPosition,
      body: revenueRows,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 120, fontStyle: 'bold' },
        1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
    
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Recommendations Section
    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text('Recommendations', 20, yPosition);
    yPosition += 8;
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    
    const recommendations: string[] = [];
    if (reportData.cancellationRate > 15) {
      recommendations.push('• Consider implementing reminder systems to reduce cancellations');
    }
    if (reportData.completionRate < 85) {
      recommendations.push('• Focus on improving appointment completion rates');
    }
    if (reportData.newPatients < reportData.totalPatients * 0.3) {
      recommendations.push('• Increase patient acquisition through referrals and marketing');
    }
    recommendations.push('• Continue maintaining excellent patient care and service quality');
    
    recommendations.forEach((rec) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(rec, 25, yPosition);
      yPosition += 6;
    });
    
    // Save the PDF with automatic filename
    const fileName = `Medical-Report-${user?.name?.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  };

  const renderTrendChart = () => {
    const { startDate, endDate } = getDateRangeFilter();
    
    // Generate array of days between start and end date
    const days: Date[] = [];
    const currentDate = new Date(startDate);
    const end = new Date(endDate);
    
    while (currentDate <= end) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const dailyStats = days.map((day: Date) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayAppointments = appointments.filter(apt => apt.date === dayStr);
      return {
        date: format(day, 'MMM dd'),
        total: dayAppointments.length,
        completed: dayAppointments.filter(apt => apt.status === 'completed').length,
        cancelled: dayAppointments.filter(apt => apt.status === 'cancelled').length,
      };
    });
    
    const maxValue = Math.max(...dailyStats.map((d: any) => d.total), 1);
    
    return (
      <div className="space-y-4">
        {dailyStats.map((stat: any, index: number) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 w-20">{stat.date}</span>
              <div className="flex-1 mx-4">
                <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                  {stat.completed > 0 && (
                    <div
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-400 to-green-500"
                      style={{ width: `${(stat.completed / maxValue) * 100}%` }}
                    />
                  )}
                  {stat.cancelled > 0 && (
                    <div
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-400 to-red-500 opacity-50"
                      style={{ 
                        width: `${(stat.cancelled / maxValue) * 100}%`,
                        marginLeft: `${(stat.completed / maxValue) * 100}%`
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-600">Total: {stat.total}</span>
                <span className="text-green-600">✓ {stat.completed}</span>
                <span className="text-red-600">✕ {stat.cancelled}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4 text-lg">Generating reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="text-left">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2 text-left">
              Reports & Analytics
            </h1>
            <p className="text-lg text-gray-600 text-left">
              Comprehensive insights into your practice performance
            </p>
          </div>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Report Period:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {(['week', 'month', 'quarter', 'year', 'custom'] as DateRange[]).map(range => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateRange === range
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {dateRange === 'custom' && (
          <div className="mt-4 flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Report Type Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarIcon },
              { id: 'appointments', name: 'Appointments', icon: CalendarDaysIcon },
              { id: 'patients', name: 'Patients', icon: UserGroupIcon },
              { id: 'revenue', name: 'Revenue', icon: BanknotesIcon },
              { id: 'cancellations', name: 'Cancellations', icon: XCircleIcon },
              { id: 'trends', name: 'Trends', icon: ArrowTrendingUpIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id as ReportType)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeReport === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Overview Report */}
      {activeReport === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{reportData.totalAppointments}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <CalendarDaysIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                <span className="text-gray-600">
                  {reportData.averageAppointmentsPerDay.toFixed(1)} per day
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{reportData.completedAppointments}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                  <CheckCircleIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-600 font-medium">
                  {reportData.completionRate.toFixed(1)}% completion rate
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Patients</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{reportData.totalPatients}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                  <UserGroupIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-purple-600 font-medium">
                  {reportData.newPatients} new patients
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-2">LKR {reportData.estimatedRevenue.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                  <BanknotesIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-gray-600">
                  LKR {(reportData.estimatedRevenue / Math.max(reportData.completedAppointments, 1)).toFixed(0)} per appointment
                </span>
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Completion Rate</span>
                    <span className="text-sm font-semibold text-green-600">{reportData.completionRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${reportData.completionRate}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Cancellation Rate</span>
                    <span className="text-sm font-semibold text-red-600">{reportData.cancellationRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full transition-all"
                      style={{ width: `${reportData.cancellationRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Times</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Busiest Day</p>
                    <p className="text-lg font-semibold text-gray-900">{reportData.peakDay}</p>
                  </div>
                  <CalendarDaysIcon className="h-8 w-8 text-purple-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500">Peak Hour</p>
                    <p className="text-lg font-semibold text-gray-900">{reportData.peakHour}</p>
                  </div>
                  <ClockIcon className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointments Report */}
      {activeReport === 'appointments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Appointment Details</h3>
            <p className="text-sm text-gray-600 mt-1">Complete list of all appointments in selected period</p>
          </div>
          <div className="divide-y divide-gray-200">
            {appointments.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDaysIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No appointments found for this period</p>
              </div>
            ) : (
              appointments.slice(0, 50).map((apt) => (
                <div key={apt._id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-medium text-sm">{apt.queueNumber}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-left">{apt.patientName}</p>
                        <p className="text-sm text-gray-500 text-left">{format(new Date(apt.date), 'MMM dd, yyyy')} at {apt.time}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ml-4 ${
                      apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                      apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      apt.status === 'in_session' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {apt.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {appointments.length > 50 && (
            <div className="p-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                Showing 50 of {appointments.length} appointments. Export to CSV for full list.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Patients Report */}
      {activeReport === 'patients' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Total Patients</h4>
                <UserGroupIcon className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-4xl font-bold text-blue-600">{reportData.totalPatients}</p>
              <p className="text-sm text-gray-600 mt-2">Unique patients served</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">New Patients</h4>
                <ArrowTrendingUpIcon className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-4xl font-bold text-green-600">{reportData.newPatients}</p>
              <p className="text-sm text-gray-600 mt-2">First-time visitors</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Return Rate</h4>
                <ArrowTrendingUpIcon className="h-6 w-6 text-purple-500" />
              </div>
              <p className="text-4xl font-bold text-purple-600">
                {reportData.totalPatients > 0 
                  ? ((1 - reportData.newPatients / reportData.totalPatients) * 100).toFixed(1)
                  : '0'}%
              </p>
              <p className="text-sm text-gray-600 mt-2">Returning patients</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Growth Insights</h3>
            <p className="text-gray-600">
              {reportData.newPatients > 0 
                ? `You've gained ${reportData.newPatients} new patients in this period. Keep up the excellent work!`
                : 'Focus on patient acquisition and referrals to grow your practice.'}
            </p>
          </div>
        </div>
      )}

      {/* Revenue Report */}
      {activeReport === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-emerald-100 text-sm mb-2">Total Revenue</p>
              <p className="text-4xl font-bold">LKR {reportData.estimatedRevenue.toLocaleString()}</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <p className="text-gray-600 text-sm mb-2">Per Appointment</p>
              <p className="text-3xl font-bold text-gray-900">
                LKR {(reportData.estimatedRevenue / Math.max(reportData.completedAppointments, 1)).toFixed(0)}
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <p className="text-gray-600 text-sm mb-2">Completed Sessions</p>
              <p className="text-3xl font-bold text-green-600">{reportData.completedAppointments}</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <p className="text-gray-600 text-sm mb-2">Potential Revenue</p>
              <p className="text-3xl font-bold text-blue-600">
                LKR {((reportData.totalAppointments - reportData.cancelledAppointments) * 3000).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Analysis</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Revenue from Completed Appointments</span>
                <span className="font-bold text-green-600">LKR {reportData.estimatedRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Lost Due to Cancellations</span>
                <span className="font-bold text-red-600">-LKR {(reportData.cancelledAppointments * 3000).toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between items-center">
                <span className="text-gray-900 font-semibold">Potential if All Completed</span>
                <span className="font-bold text-blue-600">LKR {(reportData.totalAppointments * 3000).toLocaleString()}</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4 p-3 bg-white rounded-lg">
              💡 <strong>Insight:</strong> Reducing cancellations by 50% could add LKR {((reportData.cancelledAppointments * 3000) / 2).toLocaleString()} to your revenue.
            </p>
          </div>
        </div>
      )}

      {/* Cancellations Report */}
      {activeReport === 'cancellations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Total Cancelled</h4>
                <XCircleIcon className="h-6 w-6 text-red-500" />
              </div>
              <p className="text-4xl font-bold text-red-600">{reportData.cancelledAppointments}</p>
              <p className="text-sm text-gray-600 mt-2">Cancelled appointments</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Cancellation Rate</h4>
                <ArrowTrendingDownIcon className="h-6 w-6 text-orange-500" />
              </div>
              <p className="text-4xl font-bold text-orange-600">{reportData.cancellationRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-600 mt-2">Of total appointments</p>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Lost Revenue</h4>
                <BanknotesIcon className="h-6 w-6 text-gray-500" />
              </div>
              <p className="text-4xl font-bold text-gray-900">LKR {(reportData.cancelledAppointments * 3000).toLocaleString()}</p>
              <p className="text-sm text-gray-600 mt-2">Due to cancellations</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancellation Breakdown</h3>
            <div className="space-y-3">
              {(() => {
                const cancelledByPatient = appointments.filter(apt => 
                  apt.status === 'cancelled' && apt.cancelledBy === 'patient'
                ).length;
                const cancelledByDoctor = appointments.filter(apt => 
                  apt.status === 'cancelled' && apt.cancelledBy === 'doctor'
                ).length;
                const cancelledUnknown = reportData.cancelledAppointments - cancelledByPatient - cancelledByDoctor;
                
                return (
                  <>
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <span className="text-gray-700">Cancelled by Patients</span>
                      <span className="font-bold text-red-600">{cancelledByPatient}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-gray-700">Cancelled by Doctor</span>
                      <span className="font-bold text-orange-600">{cancelledByDoctor}</span>
                    </div>
                    {cancelledUnknown > 0 && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">Other/Unknown</span>
                        <span className="font-bold text-gray-600">{cancelledUnknown}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Recommendations</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Implement reminder systems (SMS/Email) 24 hours before appointments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Offer flexible rescheduling options to reduce no-shows</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Consider implementing a cancellation policy with advance notice requirements</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Analyze patterns to identify high-risk time slots or patient groups</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Trends Report */}
      {activeReport === 'trends' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Daily Appointment Trends</h3>
            {renderTrendChart()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Indicators</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Average Daily Appointments</span>
                  <span className="font-bold text-blue-600">{reportData.averageAppointmentsPerDay.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">New Patient Acquisition</span>
                  <span className="font-bold text-green-600">{reportData.newPatients}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Patient Retention</span>
                  <span className="font-bold text-purple-600">
                    {reportData.totalPatients > 0 
                      ? ((1 - reportData.newPatients / reportData.totalPatients) * 100).toFixed(0)
                      : '0'}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Efficiency Metrics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Completion Rate</span>
                  <span className="font-bold text-green-600">{reportData.completionRate.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Revenue per Day</span>
                  <span className="font-bold text-emerald-600">
                    LKR {(reportData.estimatedRevenue / Math.max(1, Math.ceil((new Date().getTime() - getDateRangeFilter().startDate.getTime()) / (1000 * 60 * 60 * 24)))).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Busiest Day</span>
                  <span className="font-bold text-blue-600">{reportData.peakDay}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorReports;
