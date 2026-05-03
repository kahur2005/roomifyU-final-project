import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { BookingCard } from '../components/BookingCard';
import { bookingsApiReady, bookingsListRemote, type Booking } from '../utils/bookingsApi';
import { authService } from '../utils/auth';
import { Calendar, Clock, CheckCircle, Home } from 'lucide-react';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { rooms } from '../data/mockData';

export function DashboardPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [bookingList, setBookingList] = useState<Booking[]>([]);
  const remoteReady = bookingsApiReady();

  useEffect(() => {
    let cancelled = false;
    if (!remoteReady) {
      setBookingList([]);
      return;
    }

    void bookingsListRemote().then((rows) => {
      if (cancelled) return;
      setBookingList(rows);
    });

    return () => {
      cancelled = true;
    };
  }, [remoteReady]);

  if (!currentUser) {
    navigate('/login', { replace: true });
    return null;
  }

  const userBookings = bookingList
    .filter((b) => b.userId === currentUser.id)
    .filter((b) => new Date(b.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const stats = [
    {
      title: 'Upcoming Bookings',
      value: userBookings.length,
      icon: <Calendar className="h-5 w-5 text-primary" />,
      description: 'Next 30 days',
    },
    {
      title: 'Available Rooms Today',
      value: rooms.filter((r) => r.isAvailable).length,
      icon: <Home className="h-5 w-5 text-accent" />,
      description: 'Ready to book',
    },
    {
      title: 'Pending Approvals',
      value: userBookings.filter((b) => b.status === 'pending').length,
      icon: <Clock className="h-5 w-5 text-amber-500" />,
      description: 'Awaiting confirmation',
    },
    {
      title: 'Confirmed Bookings',
      value: userBookings.filter((b) => b.status === 'confirmed').length,
      icon: <CheckCircle className="h-5 w-5 text-accent" />,
      description: 'All set!',
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {getGreeting()}, {currentUser.name.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground">
              {currentUser.department} • {currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}
            </p>
          </div>
        </div>
        <Button size="lg" onClick={() => navigate('/app/rooms')}>
          Quick Book Room
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
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Upcoming Bookings</h2>
          <Button variant="outline" onClick={() => navigate('/app/bookings')}>
            View All
          </Button>
        </div>
        
        {userBookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No upcoming bookings</h3>
              <p className="text-muted-foreground text-center mb-4">
                You don't have any room bookings scheduled yet.
              </p>
              <Button onClick={() => navigate('/app/rooms')}>
                Book a Room
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userBookings.slice(0, 4).map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onView={() => navigate('/app/bookings')}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/app/rooms')}
            >
              <Home className="h-6 w-6" />
              <span>Find Rooms</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/app/bookings')}
            >
              <Calendar className="h-6 w-6" />
              <span>My Bookings</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate('/app/profile')}
            >
              <CheckCircle className="h-6 w-6" />
              <span>Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
