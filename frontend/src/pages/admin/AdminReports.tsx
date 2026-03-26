import React, { useState, useEffect } from "react";
import api from "../../services/api";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAdminAuth } from "../../context/AdminAuthContext";
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  UsersIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

interface Doctor {
  _id: string;
  name: string;
  email: string;
  fullName?: string;
  specialization?: string;
}

interface Appointment {
  _id: string;
  patientName: string;
  doctorId: string;
  date: string;
  time: string;
  status: "booked" | "in_session" | "completed" | "cancelled";
  queueNumber: number;
  createdAt?: string;
}

interface SystemStats {
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  systemRevenue: number;
  avgAppointmentsPerDoctor: number;
  completionRate: number;
  cancellationRate: number;
  doctorPerformance: DoctorPerformance[];
}

interface DoctorPerformance {
  doctorId: string;
  doctorName: string;
  specialization: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  uniquePatients: number;
  revenue: number;
  completionRate: number;
}

type ReportType = 'overview' | 'doctors' | 'patients' | 'revenue' | 'system' | 'comparison';
type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'custom';

const AdminReports: React.FC = () => {
  const { admin } = useAdminAuth();
  const [activeReport, setActiveReport] = useState<ReportType>('overview');
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalDoctors: 0,
    totalPatients: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    systemRevenue: 0,
    avgAppointmentsPerDoctor: 0,
    completionRate: 0,
    cancellationRate: 0,
    doctorPerformance: [],
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange, customStartDate, customEndDate]);

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
    setLoading(true);
    try {
      // Fetch all doctors
      const doctorsResponse = await api.get('/doctors');
      const allDoctors: Doctor[] = doctorsResponse.data.doctors || doctorsResponse.data.data || [];
      console.log('Fetched doctors:', allDoctors.length);

      // Fetch all appointments
      const appointmentsResponse = await api.get('/appointment');
      const allAppointments: Appointment[] = appointmentsResponse.data.appointments || appointmentsResponse.data || [];
      console.log('Fetched appointments:', allAppointments.length);
      console.log('Sample appointment:', allAppointments[0]);

      // Filter by date range
      const { startDate, endDate } = getDateRangeFilter();
      const filteredAppointments = allAppointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= startDate && aptDate <= endDate;
      });

      console.log(`Filtered appointments (${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}):`, filteredAppointments.length);

      await calculateSystemStats(allDoctors, filteredAppointments);
    } catch (error) {
      console.error('Error fetching admin report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSystemStats = async (doctorsList: Doctor[], appointmentsList: Appointment[]) => {
    const totalDoctors = doctorsList.length;
    const totalAppointments = appointmentsList.length;
    const completedAppointments = appointmentsList.filter(apt => apt.status === 'completed').length;
    const cancelledAppointments = appointmentsList.filter(apt => apt.status === 'cancelled').length;

    // Calculate unique patients
    const uniquePatients = new Set(appointmentsList.map(apt => apt.patientName)).size;

    // Get real revenue from diagnosis API
    let systemRevenue = 0;
    try {
      const { startDate, endDate } = getDateRangeFilter();
      console.log(`Fetching revenue for date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
      const { getRevenueStats } = await import('../../services/diagnosis.api');
      const revenueStats = await getRevenueStats({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      });
      console.log('Revenue stats received:', revenueStats);
      systemRevenue = revenueStats.totalRevenue;
      console.log('System revenue:', systemRevenue);
    } catch (error) {
      console.error('Error fetching system revenue stats:', error);
      // Fallback to estimated revenue if diagnosis data not available
      systemRevenue = completedAppointments * 3000; // 1000 registration + ~2000 average doctor fee
      console.log('Using fallback revenue:', systemRevenue);
    }

    // Calculate rates
    const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;
    const cancellationRate = totalAppointments > 0 ? (cancelledAppointments / totalAppointments) * 100 : 0;

    // Calculate average appointments per doctor
    const avgAppointmentsPerDoctor = totalDoctors > 0 ? totalAppointments / totalDoctors : 0;

    // Calculate doctor performance with real revenue
    const doctorPerformance: DoctorPerformance[] = await Promise.all(
      doctorsList.map(async (doctor) => {
        console.log(`Processing doctor: ${doctor.name} (${doctor._id})`);

        // Handle both populated and non-populated doctorId
        const doctorAppointments = appointmentsList.filter(apt => {
          // If doctorId is populated (an object with _id), extract the _id
          const aptDoctorId = typeof apt.doctorId === 'object' && apt.doctorId !== null
            ? (apt.doctorId as any)._id
            : apt.doctorId;

          const docId = String(doctor._id);
          const aptDocIdStr = String(aptDoctorId);

          return aptDocIdStr === docId;
        });

        console.log(`  Found ${doctorAppointments.length} appointments for ${doctor.name}`);

        const doctorCompleted = doctorAppointments.filter(apt => apt.status === 'completed').length;
        const doctorCancelled = doctorAppointments.filter(apt => apt.status === 'cancelled').length;
        const doctorPatients = new Set(doctorAppointments.map(apt => apt.patientName)).size;

        console.log(`  Completed: ${doctorCompleted}, Cancelled: ${doctorCancelled}, Unique Patients: ${doctorPatients}`);

        // Get doctor's actual revenue
        let doctorRevenue = 0;
        try {
          const { startDate, endDate } = getDateRangeFilter();
          const { getRevenueStats } = await import('../../services/diagnosis.api');
          const revenueStats = await getRevenueStats({
            doctorId: doctor._id,
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: format(endDate, 'yyyy-MM-dd'),
          });
          doctorRevenue = revenueStats.totalRevenue;
          console.log(`  Doctor revenue: LKR ${doctorRevenue}`);
        } catch (error) {
          console.error(`Error fetching revenue for doctor ${doctor._id}:`, error);
          doctorRevenue = doctorCompleted * 3000; // Fallback
          console.log(`  Using fallback doctor revenue: LKR ${doctorRevenue}`);
        }

        const doctorCompletionRate = doctorAppointments.length > 0
          ? (doctorCompleted / doctorAppointments.length) * 100
          : 0;

        return {
          doctorId: doctor._id,
          doctorName: doctor.fullName || doctor.name,
          specialization: doctor.specialization || 'N/A',
          totalAppointments: doctorAppointments.length,
          completedAppointments: doctorCompleted,
          cancelledAppointments: doctorCancelled,
          uniquePatients: doctorPatients,
          revenue: doctorRevenue,
          completionRate: doctorCompletionRate,
        };
      })
    );

    const sortedPerformance = doctorPerformance.sort((a, b) => b.totalAppointments - a.totalAppointments);

    console.log('Doctor Performance Data:', sortedPerformance);

    setSystemStats({
      totalDoctors,
      totalPatients: uniquePatients,
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      systemRevenue,
      avgAppointmentsPerDoctor,
      completionRate,
      cancellationRate,
      doctorPerformance: sortedPerformance,
    });
  };

  const exportRevenueReport = () => {
    const { startDate, endDate } = getDateRangeFilter();
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Emerald color
    doc.text('Revenue Analysis Report', 105, 20, { align: 'center' });

    // Add subtitle
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`HealthMate Healthcare Management System`, 105, 30, { align: 'center' });
    doc.text(`Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`, 105, 36, { align: 'center' });
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 105, 42, { align: 'center' });

    // Add decorative line
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.5);
    doc.line(20, 46, 190, 46);

    let yPosition = 55;

    // Revenue Summary Section
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Revenue Summary', 20, yPosition);
    yPosition += 10;

    const revenueMetrics = [
      ['Total System Revenue', `LKR ${systemStats.systemRevenue.toLocaleString()}`],
      ['Revenue Per Appointment', `LKR ${(systemStats.systemRevenue / Math.max(systemStats.completedAppointments, 1)).toFixed(0)}`],
      ['Revenue Per Doctor (Avg)', `LKR ${(systemStats.systemRevenue / Math.max(systemStats.totalDoctors, 1)).toFixed(0)}`],
      ['Lost Due to Cancellations', `LKR ${(systemStats.cancelledAppointments * 3000).toLocaleString()}`],
      ['Potential Revenue', `LKR ${((systemStats.totalAppointments - systemStats.cancelledAppointments) * 3000).toLocaleString()}`],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Amount (LKR)']],
      body: revenueMetrics,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 11, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 120, fontStyle: 'bold' },
        1: { cellWidth: 60, halign: 'right', textColor: [16, 185, 129], fontStyle: 'bold' }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Doctor Revenue Breakdown
    doc.setFontSize(16);
    doc.text('Revenue by Doctor', 20, yPosition);
    yPosition += 8;

    const doctorRevenueRows = systemStats.doctorPerformance.map((perf, index) => [
      `#${index + 1}`,
      perf.doctorName,
      perf.specialization,
      perf.completedAppointments.toString(),
      `LKR ${perf.revenue.toLocaleString()}`,
      `${((perf.revenue / Math.max(systemStats.systemRevenue, 1)) * 100).toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Rank', 'Doctor Name', 'Specialization', 'Completed', 'Revenue', '% of Total']],
      body: doctorRevenueRows,
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 35, halign: 'right', textColor: [16, 185, 129], fontStyle: 'bold' },
        5: { cellWidth: 25, halign: 'center' }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Revenue Insights
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129);
    doc.text('Key Insights', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const insights = [
      `Total revenue generated: LKR ${systemStats.systemRevenue.toLocaleString()}`,
      `Average revenue per completed appointment: LKR ${(systemStats.systemRevenue / Math.max(systemStats.completedAppointments, 1)).toFixed(0)}`,
      `${systemStats.totalDoctors} active doctors contributing to system revenue`,
      `Top earning doctor: ${systemStats.doctorPerformance[0]?.doctorName || 'N/A'} (LKR ${systemStats.doctorPerformance[0]?.revenue.toLocaleString() || '0'})`,
      `Lost revenue due to ${systemStats.cancelledAppointments} cancellations: LKR ${(systemStats.cancelledAppointments * 3000).toLocaleString()}`,
    ];

    insights.forEach((insight) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      // Add bullet point
      doc.setFontSize(12);
      doc.text('\u2022', 22, yPosition);
      doc.setFontSize(10);
      doc.text(insight, 28, yPosition);
      yPosition += 7;
    });

    // Add footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, 105, 282, { align: 'center' });
      doc.text('HealthMate Revenue Report - Confidential', 105, 287, { align: 'center' });
      doc.text(`Generated by: ${admin?.fullName || 'System Admin'}`, 105, 292, { align: 'center' });
    }

    // Save the PDF
    const fileName = `Revenue-Report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
    doc.save(fileName);
  };

  const exportToPDF = () => {
    const { startDate, endDate } = getDateRangeFilter();
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text('System-Wide Admin Report', 105, 20, { align: 'center' });

    // Add subtitle info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`HealthMate Healthcare Management System`, 105, 30, { align: 'center' });
    doc.text(`Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`, 105, 36, { align: 'center' });
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 105, 42, { align: 'center' });

    // Add horizontal line
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.5);
    doc.line(20, 46, 190, 46);

    let yPosition = 55;

    // System Overview Section
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('System Overview', 20, yPosition);
    yPosition += 8;

    const systemMetrics = [
      ['Total Doctors', systemStats.totalDoctors.toString()],
      ['Total Patients', systemStats.totalPatients.toString()],
      ['Total Appointments', systemStats.totalAppointments.toString()],
      ['Completed Appointments', systemStats.completedAppointments.toString()],
      ['Cancelled Appointments', systemStats.cancelledAppointments.toString()],
      ['System Revenue', `LKR ${systemStats.systemRevenue.toLocaleString()}`],
      ['Completion Rate', `${systemStats.completionRate.toFixed(1)}%`],
      ['Cancellation Rate', `${systemStats.cancellationRate.toFixed(1)}%`],
      ['Avg Appointments/Doctor', systemStats.avgAppointmentsPerDoctor.toFixed(1)],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: systemMetrics,
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

    // Doctor Performance Section
    doc.setFontSize(14);
    doc.text('Doctor Performance Comparison', 20, yPosition);
    yPosition += 8;

    const doctorRows = systemStats.doctorPerformance.map(perf => [
      perf.doctorName,
      perf.specialization,
      perf.totalAppointments.toString(),
      perf.completedAppointments.toString(),
      perf.uniquePatients.toString(),
      `LKR ${perf.revenue.toLocaleString()}`,
      `${perf.completionRate.toFixed(1)}%`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Doctor', 'Specialization', 'Total', 'Completed', 'Patients', 'Revenue', 'Rate']],
      body: doctorRows,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 35 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 20, halign: 'center' }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // System Insights Section
    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text('System Insights & Recommendations', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    const insights: string[] = [
      `• System managing ${systemStats.totalDoctors} doctors serving ${systemStats.totalPatients} patients`,
      `• Overall completion rate: ${systemStats.completionRate.toFixed(1)}%`,
      `• Top performing doctor: ${systemStats.doctorPerformance[0]?.doctorName || 'N/A'}`,
      `• Average appointments per doctor: ${systemStats.avgAppointmentsPerDoctor.toFixed(1)}`,
    ];

    if (systemStats.cancellationRate > 15) {
      insights.push('• High cancellation rate - implement system-wide reminder protocols');
    }
    if (systemStats.completionRate < 85) {
      insights.push('• Monitor appointment completion rates across all doctors');
    }

    insights.forEach((insight) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(insight, 25, yPosition);
      yPosition += 6;
    });

    // Add footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, 105, 282, { align: 'center' });
      doc.text('HealthMate System Report - Confidential', 105, 287, { align: 'center' });
      doc.text(`Generated by: ${admin?.fullName || 'System Admin'}`, 105, 292, { align: 'center' });
    }

    // Save the PDF
    const fileName = `Admin-System-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4 text-lg">Generating system reports...</p>
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
              System Reports & Analytics
            </h1>
            <p className="text-lg text-gray-600 text-left">
              Comprehensive insights across all doctors, patients, and appointments
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateRange === range
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
              { id: 'overview', name: 'System Overview', icon: ChartBarIcon },
              { id: 'doctors', name: 'Doctor Performance', icon: UsersIcon },
              { id: 'patients', name: 'Patient Statistics', icon: UserGroupIcon },
              { id: 'revenue', name: 'Revenue Analysis', icon: BanknotesIcon },
              { id: 'comparison', name: 'Comparison', icon: BuildingOfficeIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveReport(tab.id as ReportType)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeReport === tab.id
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

      {/* System Overview Report */}
      {activeReport === 'overview' && (
        <div className="space-y-6">
          {/* Key System Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Doctors</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{systemStats.totalDoctors}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <UsersIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-gray-600">
                  {systemStats.avgAppointmentsPerDoctor.toFixed(1)} avg appointments
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Patients</p>
                  <p className="text-3xl font-bold text-purple-600 mt-2">{systemStats.totalPatients}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                  <UserGroupIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-gray-600">Unique patients served</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Appointments</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{systemStats.totalAppointments}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                  <CalendarDaysIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-600 font-medium">
                  {systemStats.completedAppointments} completed
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">System Revenue</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-2">LKR {systemStats.systemRevenue.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl">
                  <BanknotesIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-gray-600">
                  LKR {(systemStats.systemRevenue / Math.max(systemStats.completedAppointments, 1)).toFixed(0)} per appointment
                </span>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Performance</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Completion Rate</span>
                    <span className="text-sm font-semibold text-green-600">{systemStats.completionRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${systemStats.completionRate}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Cancellation Rate</span>
                    <span className="text-sm font-semibold text-red-600">{systemStats.cancellationRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-red-400 to-red-600 h-2 rounded-full transition-all"
                      style={{ width: `${systemStats.cancellationRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
              <div className="space-y-3">
                {systemStats.doctorPerformance.slice(0, 3).map((doctor, index) => (
                  <div key={doctor.doctorId} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{doctor.doctorName}</p>
                        <p className="text-xs text-gray-500">{doctor.specialization}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{doctor.totalAppointments}</p>
                      <p className="text-xs text-gray-500">appointments</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Performance Report */}
      {activeReport === 'doctors' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Doctor Performance Comparison</h3>
            <p className="text-sm text-gray-600 mt-1">Performance metrics for all doctors in the system</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Appointments</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Patients</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {systemStats.doctorPerformance.map((doctor, index) => (
                  <tr key={doctor.doctorId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-sm">
                            {doctor.doctorName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium text-gray-900">{doctor.doctorName}</span>
                            <span className="text-xs text-gray-500 whitespace-nowrap">Rank #{index + 1}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left">
                      <span className="text-sm text-gray-900">{doctor.specialization}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-900">{doctor.totalAppointments}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-green-600">{doctor.completedAppointments}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-900">{doctor.uniquePatients}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-emerald-600">LKR {doctor.revenue.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${doctor.completionRate >= 90 ? 'bg-green-100 text-green-800' :
                          doctor.completionRate >= 75 ? 'bg-blue-100 text-blue-800' :
                            doctor.completionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                        }`}>
                        {doctor.completionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Patient Statistics Report */}
      {activeReport === 'patients' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Unique Patients</h4>
                <UserGroupIcon className="h-6 w-6 text-purple-500" />
              </div>
              <p className="text-4xl font-bold text-purple-600">{systemStats.totalPatients}</p>
              <p className="text-sm text-gray-600 mt-2">Served across all doctors</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Avg Patients/Doctor</h4>
                <ArrowTrendingUpIcon className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-4xl font-bold text-blue-600">
                {(systemStats.totalPatients / Math.max(systemStats.totalDoctors, 1)).toFixed(1)}
              </p>
              <p className="text-sm text-gray-600 mt-2">Distribution metric</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Total Visits</h4>
                <CalendarDaysIcon className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-4xl font-bold text-green-600">{systemStats.totalAppointments}</p>
              <p className="text-sm text-gray-600 mt-2">Appointments booked</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Distribution</h3>
            <p className="text-gray-700 mb-4">
              The system is currently serving <strong>{systemStats.totalPatients}</strong> unique patients
              distributed across <strong>{systemStats.totalDoctors}</strong> doctors, with an average of{' '}
              <strong>{(systemStats.totalPatients / Math.max(systemStats.totalDoctors, 1)).toFixed(1)}</strong> patients per doctor.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {systemStats.doctorPerformance.slice(0, 6).map((doctor) => (
                <div key={doctor.doctorId} className="bg-white rounded-lg p-4">
                  <p className="font-medium text-gray-900 text-sm">{doctor.doctorName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">{doctor.specialization}</span>
                    <span className="text-sm font-bold text-blue-600">{doctor.uniquePatients} patients</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Revenue Analysis Report */}
      {activeReport === 'revenue' && (
        <div className="space-y-6">
          {/* Revenue Export Button */}
          <div className="flex justify-end">
            <button
              onClick={exportRevenueReport}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg font-medium"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              Download Revenue Report
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg p-6 text-white">
              <p className="text-emerald-100 text-sm mb-2">Total System Revenue</p>
              <p className="text-4xl font-bold">LKR {systemStats.systemRevenue.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <p className="text-gray-600 text-sm mb-2">Per Appointment</p>
              <p className="text-3xl font-bold text-gray-900">
                LKR {(systemStats.systemRevenue / Math.max(systemStats.completedAppointments, 1)).toFixed(0)}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <p className="text-gray-600 text-sm mb-2">Per Doctor (Avg)</p>
              <p className="text-3xl font-bold text-blue-600">
                LKR {(systemStats.systemRevenue / Math.max(systemStats.totalDoctors, 1)).toFixed(0)}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <p className="text-gray-600 text-sm mb-2">Lost Revenue</p>
              <p className="text-3xl font-bold text-red-600">
                LKR {(systemStats.cancelledAppointments * 3000).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Doctor</h3>
            <div className="space-y-3">
              {systemStats.doctorPerformance.map((doctor, index) => {
                const maxRevenue = Math.max(...systemStats.doctorPerformance.map(d => d.revenue));
                const revenuePercentage = maxRevenue > 0 ? (doctor.revenue / maxRevenue) * 100 : 0;

                return (
                  <div key={doctor.doctorId} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-700 w-6">#{index + 1}</span>
                        <span className="font-medium text-gray-900">{doctor.doctorName}</span>
                        <span className="text-gray-500">({doctor.specialization})</span>
                      </div>
                      <span className="font-bold text-emerald-600">LKR {doctor.revenue.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all"
                        style={{ width: `${revenuePercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Comparison Report */}
      {activeReport === 'comparison' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Doctor Comparison Matrix</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Best Performing Doctor */}
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">🏆</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Top Performer</h4>
                    <p className="text-sm text-gray-600">Highest completion rate</p>
                  </div>
                </div>
                {(() => {
                  const topDoctor = [...systemStats.doctorPerformance].sort((a, b) => b.completionRate - a.completionRate)[0];
                  return topDoctor ? (
                    <div>
                      <p className="text-xl font-bold text-blue-600">{topDoctor.doctorName}</p>
                      <p className="text-sm text-gray-600">{topDoctor.specialization}</p>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Completion Rate:</span>
                          <span className="font-semibold text-green-600">{topDoctor.completionRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Appointments:</span>
                          <span className="font-semibold">{topDoctor.totalAppointments}</span>
                        </div>
                      </div>
                    </div>
                  ) : <p className="text-gray-500">No data available</p>;
                })()}
              </div>

              {/* Busiest Doctor */}
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">📈</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Busiest Doctor</h4>
                    <p className="text-sm text-gray-600">Most appointments</p>
                  </div>
                </div>
                {(() => {
                  const busiestDoctor = [...systemStats.doctorPerformance].sort((a, b) => b.totalAppointments - a.totalAppointments)[0];
                  return busiestDoctor ? (
                    <div>
                      <p className="text-xl font-bold text-purple-600">{busiestDoctor.doctorName}</p>
                      <p className="text-sm text-gray-600">{busiestDoctor.specialization}</p>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Appointments:</span>
                          <span className="font-semibold text-purple-600">{busiestDoctor.totalAppointments}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Patients Served:</span>
                          <span className="font-semibold">{busiestDoctor.uniquePatients}</span>
                        </div>
                      </div>
                    </div>
                  ) : <p className="text-gray-500">No data available</p>;
                })()}
              </div>

              {/* Top Revenue Generator */}
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">💰</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Revenue Leader</h4>
                    <p className="text-sm text-gray-600">Highest revenue generated</p>
                  </div>
                </div>
                {(() => {
                  const topRevenueDoctor = [...systemStats.doctorPerformance].sort((a, b) => b.revenue - a.revenue)[0];
                  return topRevenueDoctor ? (
                    <div>
                      <p className="text-xl font-bold text-emerald-600">{topRevenueDoctor.doctorName}</p>
                      <p className="text-sm text-gray-600">{topRevenueDoctor.specialization}</p>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Revenue:</span>
                          <span className="font-semibold text-emerald-600">LKR {topRevenueDoctor.revenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Completed:</span>
                          <span className="font-semibold">{topRevenueDoctor.completedAppointments}</span>
                        </div>
                      </div>
                    </div>
                  ) : <p className="text-gray-500">No data available</p>;
                })()}
              </div>

              {/* Most Popular */}
              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">⭐</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Most Popular</h4>
                    <p className="text-sm text-gray-600">Most unique patients</p>
                  </div>
                </div>
                {(() => {
                  const mostPopularDoctor = [...systemStats.doctorPerformance].sort((a, b) => b.uniquePatients - a.uniquePatients)[0];
                  return mostPopularDoctor ? (
                    <div>
                      <p className="text-xl font-bold text-orange-600">{mostPopularDoctor.doctorName}</p>
                      <p className="text-sm text-gray-600">{mostPopularDoctor.specialization}</p>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Unique Patients:</span>
                          <span className="font-semibold text-orange-600">{mostPopularDoctor.uniquePatients}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Return Rate:</span>
                          <span className="font-semibold">
                            {mostPopularDoctor.uniquePatients > 0
                              ? ((mostPopularDoctor.totalAppointments / mostPopularDoctor.uniquePatients) - 1).toFixed(1)
                              : '0'
                            }x
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : <p className="text-gray-500">No data available</p>;
                })()}
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span>💡</span>
              System Recommendations
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              {systemStats.cancellationRate > 15 && (
                <li className="flex items-start gap-2">
                  <span className="text-red-600 mt-1">•</span>
                  <span>High system-wide cancellation rate ({systemStats.cancellationRate.toFixed(1)}%) - implement automated reminder system</span>
                </li>
              )}
              {systemStats.completionRate < 85 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1">•</span>
                  <span>System completion rate is {systemStats.completionRate.toFixed(1)}% - monitor individual doctor performance</span>
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Average {systemStats.avgAppointmentsPerDoctor.toFixed(1)} appointments per doctor - consider balancing workload</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-1">•</span>
                <span>Share best practices from top-performing doctors with the entire team</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
