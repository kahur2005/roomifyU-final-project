import { useEffect, useState } from 'react';
import { BookingCard } from '../components/BookingCard';
import type { Booking } from '../utils/bookingsApi';
import { authService } from '../utils/auth';
import { bookingsApiReady, bookingsListRemote } from '../utils/bookingsApi';
import { useNavigate } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Search, Calendar, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

export function MyBookingsPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const remoteReady = bookingsApiReady();
  const [bookingList, setBookingList] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!currentUser?.id) return;

    let cancelled = false;
    if (!remoteReady) {
      setBookingList([]);
      return;
    }

    void bookingsListRemote().then((rows) => {
      if (cancelled) return;
      setBookingList(rows.filter((b) => b.userName === currentUser.name));
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, remoteReady]);

  if (!currentUser) {
    navigate('/login', { replace: true });
    return null;
  }

  const userBookings = bookingList;

  const upcomingBookings = userBookings
    .filter(
      (b) => new Date(`${b.date}T12:00:00`) >= new Date() && b.status !== 'cancelled',
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastBookings = userBookings
    .filter(
      (b) => new Date(`${b.date}T12:00:00`) < new Date() || b.status === 'cancelled',
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filterBookings = (bookingsList: Booking[]) => {
    return bookingsList.filter(booking => {
      // Search filter
      if (searchQuery && !booking.roomName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !booking.building.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && booking.status !== statusFilter) {
        return false;
      }

      return true;
    });
  };

  const handleCancel = (booking: Booking) => {
    toast.success(`Booking for ${booking.roomName} has been cancelled.`);
  };

  const handleEdit = (_booking: Booking) => {
    toast.info('Edit booking functionality coming soon!');
  };

  const handleView = (_booking: Booking) => {
    toast.info('View booking details coming soon!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
        <p className="text-muted-foreground">
          View and manage all your room bookings
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="past">
            Past ({pastBookings.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {filterBookings(upcomingBookings).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No upcoming bookings</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No bookings match your search criteria.'
                    : "You don't have any upcoming room bookings."}
                </p>
                {!(searchQuery || statusFilter !== 'all') && (
                  <Button onClick={() => navigate('/app/rooms')}>
                    Book a Room
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filterBookings(upcomingBookings).map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onView={handleView}
                  onEdit={handleEdit}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {filterBookings(pastBookings).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No past bookings</h3>
                <p className="text-muted-foreground text-center">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No bookings match your search criteria.'
                    : "You don't have any past bookings yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filterBookings(pastBookings).map(booking => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onView={handleView}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
