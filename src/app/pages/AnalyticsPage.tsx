import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { authService } from '../utils/auth';
import { bookingsApiReady, bookingsListRemote, type Booking } from '../utils/bookingsApi';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Calendar, Download, TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

export function AnalyticsPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [bookingList, setBookingList] = useState<Booking[]>([]);
  const [dateRange, setDateRange] = useState('last-30-days');
  const remoteReady = bookingsApiReady();

  useEffect(() => {
    if (!remoteReady) {
      setBookingList([]);
      return;
    }

    let cancelled = false;
    void bookingsListRemote().then((rows) => {
      if (cancelled) return;
      setBookingList(rows);
    });

    return () => {
      cancelled = true;
    };
  }, [remoteReady]);

  if (!currentUser || currentUser.role !== 'admin') {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const chartColor = '#2563EB';
  const totalBookings = bookingList.length;
  const activeRooms = new Set(bookingList.map((booking) => booking.roomId)).size;
  const roomUtilization = totalBookings ? Math.min(100, Math.round((totalBookings / 20) * 100)) : 0;

  const utilizationData = useMemo(
    () => [
      { name: 'Utilized', value: roomUtilization },
      { name: 'Available', value: 100 - roomUtilization },
    ],
    [roomUtilization]
  );

  const weeklyBookings = useMemo(() => {
    const windowDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return {
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        key: date.toISOString().split('T')[0],
        bookings: 0,
      };
    });

    const dayMap = new Map(windowDays.map((item) => [item.key, item]));
    bookingList.forEach((booking) => {
      const item = dayMap.get(booking.date);
      if (item) {
        item.bookings += 1;
      }
    });

    return windowDays.map((item) => ({ day: item.day, bookings: item.bookings }));
  }, [bookingList]);

  const hourlyUtilization = useMemo(() => {
    const hours = Array.from({ length: 11 }, (_, index) => {
      const hour = 8 + index;
      return { hour: `${String(hour).padStart(2, '0')}:00`, utilization: 0 };
    });

    const hourMap = new Map(hours.map((item) => [item.hour, 0]));
    bookingList.forEach((booking) => {
      const hour = Number(booking.startTime.split(':')[0]);
      const label = `${String(hour).padStart(2, '0')}:00`;
      if (hourMap.has(label)) {
        hourMap.set(label, hourMap.get(label)! + 1);
      }
    });

    return hours.map((item) => ({
      hour: item.hour,
      utilization: Math.min(100, Math.round((hourMap.get(item.hour)! / 3) * 100)),
    }));
  }, [bookingList]);

  const roomTypeData = useMemo(() => {
    const counts = new Map<string, number>();
    bookingList.forEach((booking) => {
      counts.set(booking.roomName, (counts.get(booking.roomName) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([type, bookings]) => ({ type, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);
  }, [bookingList]);

  const handleExport = (format: 'csv' | 'pdf') => {
    toast.success(`Exporting report as ${format.toUpperCase()}...`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics & Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into room utilization and bookings
          </p>
          {!remoteReady && (
            <p className="text-sm text-muted-foreground mt-2">
              Analytics data will appear once the GAS backend session is active.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-7-days">Last 7 Days</SelectItem>
              <SelectItem value="last-30-days">Last 30 Days</SelectItem>
              <SelectItem value="last-90-days">Last 90 Days</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalBookings}</div>
            <div className="flex items-center gap-1 text-sm text-accent mt-1">
              <TrendingUp className="h-4 w-4" />
              <span>Live from backend</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{roomUtilization}%</div>
            <div className="flex items-center gap-1 text-sm text-accent mt-1">
              <TrendingUp className="h-4 w-4" />
              <span>Live from backend</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Rooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeRooms}</div>
            <p className="text-sm text-muted-foreground mt-1">Live bookings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Booking Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">2.5h</div>
            <p className="text-sm text-muted-foreground mt-1">Per booking</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Booking Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyBookings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="bookings" fill={chartColor} name="Bookings" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overall Room Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={utilizationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }: { name?: string; value?: number }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill={chartColor}
                  dataKey="value"
                >
                  {utilizationData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? chartColor : 'rgba(37, 99, 235, 0.35)'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Peak Hours Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyUtilization}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="utilization"
                  stroke={chartColor}
                  strokeWidth={3}
                  dot={{ r: 4, fill: chartColor }}
                  activeDot={{ r: 6 }}
                  connectNulls
                  name="Utilization %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bookings by Room Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={roomTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="type" type="category" width={140} />
                <Tooltip />
                <Bar dataKey="bookings" fill={chartColor} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
