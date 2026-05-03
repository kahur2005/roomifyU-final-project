import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Calendar, Home, Clock, TrendingUp } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { authService } from '../utils/auth';
import { useNavigate } from 'react-router';
import { bookingsApiReady, bookingsListRemote, type Booking } from '../utils/bookingsApi';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [bookingList, setBookingList] = useState<Booking[]>([]);
  const remoteReady = bookingsApiReady();

  useEffect(() => {
    if (!remoteReady) {
      setBookingList([]);
      return;
    }

    let cancelled = false;
    void bookingsListRemote().then((rows) => {
      if (!cancelled) return;
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

  const totalBookings = bookingList.length;
  const pendingApprovals = bookingList.filter((b) => b.status === 'pending').length;
  const activeRooms = new Set(bookingList.map((b) => b.roomId)).size;
  const roomUtilization = totalBookings ? Math.min(100, Math.round((totalBookings / 20) * 100)) : 0;

  const stats = [
    {
      title: 'Total Bookings',
      value: totalBookings,
      icon: <Calendar className="h-5 w-5 text-primary" />,
      change: '+12% from last month',
    },
    {
      title: 'Room Utilization',
      value: `${roomUtilization}%`,
      icon: <TrendingUp className="h-5 w-5 text-accent" />,
      change: '+5% from last month',
    },
    {
      title: 'Pending Approvals',
      value: pendingApprovals,
      icon: <Clock className="h-5 w-5 text-amber-500" />,
      change: 'Needs attention',
    },
    {
      title: 'Active Rooms',
      value: activeRooms,
      icon: <Home className="h-5 w-5 text-primary" />,
      change: '2 under maintenance',
    },
  ];

  const recentBookings = useMemo(
    () => [...bookingList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [bookingList]
  );

  const weeklyBookings = useMemo(() => {
    const windowDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().split('T')[0];
      return {
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        key,
        bookings: 0,
      };
    });

    const dayMap = new Map(windowDays.map((item) => [item.key, item]));
    bookingList.forEach((booking) => {
      const item = dayMap.get(booking.date);
      if (item) item.bookings += 1;
    });

    return windowDays.map((item) => ({ day: item.day, bookings: item.bookings }));
  }, [bookingList]);

  const hourlyUtilizationData = useMemo(() => {
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

  const topRooms = useMemo(() => {
    const counts = new Map<string, number>();
    bookingList.forEach((booking) => {
      counts.set(booking.roomName, (counts.get(booking.roomName) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, bookings]) => ({ name, bookings }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 5);
  }, [bookingList]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of room bookings and system statistics
          </p>
          {!remoteReady && (
            <p className="text-sm text-muted-foreground mt-2">
              Backend session is not active. Pending approvals and booking analytics require a live GAS session.
            </p>
          )}
        </div>
        <Button onClick={() => navigate('/app/admin/approvals')}>
          View Pending Approvals
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyBookings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyUtilizationData} margin={{ top: 12, right: 16, left: 0, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" interval={0} tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tickCount={6} />
                <Tooltip />
                <Line type="monotone" dataKey="utilization" stroke="#06b6d4" strokeWidth={3} dot={{ r: 3, fill: '#06b6d4' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Booking Requests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Booking Requests</CardTitle>
            <Button variant="outline" onClick={() => navigate('/app/admin/approvals')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{booking.roomName}</h4>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {booking.userName} • {booking.building}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(booking.date).toLocaleDateString()} • {booking.startTime} - {booking.endTime}
                  </p>
                </div>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Most Booked Rooms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topRooms.map((room, index) => (
              <div key={room.name} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{room.name}</p>
                  <div className="w-full bg-muted rounded-full h-2 mt-1">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${topRooms[0]?.bookings ? (room.bookings / topRooms[0].bookings) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium">{room.bookings}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
