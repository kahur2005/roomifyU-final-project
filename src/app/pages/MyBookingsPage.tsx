import { useCallback, useEffect, useState } from 'react';
import { BookingCard } from '../components/BookingCard';
import type { Booking } from '../utils/bookingsApi';
import { authService } from '../utils/auth';
import { bookingsApiReady, bookingsListRemote } from '../utils/bookingsApi';
import { useNavigate } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Search, Calendar, Filter, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

export function MyBookingsPage() {
  const navigate    = useNavigate();
  const currentUser = authService.getCurrentUser();
  const remoteReady = bookingsApiReady();

  const [bookingList, setBookingList] = useState<Booking[]>([]);
  const [isLoading,   setIsLoading]   = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [statusFilter,  setStatusFilter]  = useState('all');

  const loadBookings = useCallback(async () => {
    if (!currentUser) return;
    if (!remoteReady) {
      setBookingList([]);
      return;
    }

    setIsLoading(true);
    try {
      const rows = await bookingsListRemote();

      // Normalised comparison so "John Doe" === "john doe", trailing spaces ignored.
      const myName  = (currentUser.name  || '').toLowerCase().trim();
      const myEmail = (currentUser.email || currentUser.id || '').toLowerCase().trim();

      const mine = rows.filter((b) => {
        const stored = (b.userName || '').toLowerCase().trim();
        return stored === myName || stored === myEmail;
      });

      setBookingList(mine);
    } catch {
      toast.error('Failed to load bookings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, remoteReady]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  if (!currentUser) {
    navigate('/login', { replace: true });
    return null;
  }

  // Rejected bookings go to History regardless of date — makes UX sense.
  const isUpcoming = (b: Booking) =>
    new Date(`${b.date}T12:00:00`) >= new Date() &&
    b.status !== 'cancelled' &&
    b.status !== 'rejected';

  const upcomingBookings = bookingList
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastBookings = bookingList
    .filter((b) => !isUpcoming(b))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const applyFilters = (list: Booking[]) =>
    list.filter((b) => {
      if (
        searchQuery &&
        !b.roomName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(b.building || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
        !b.purpose.toLowerCase().includes(searchQuery.toLowerCase())
      ) return false;
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      return true;
    });

  const handleCancel = (booking: Booking) => {
    toast.success(`Booking for ${booking.roomName} has been cancelled.`);
  };
  const handleEdit  = (_booking: Booking) => { toast.info('Edit booking coming soon!'); };
  const handleView  = (_booking: Booking) => { toast.info('View booking details coming soon!'); };

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((n) => (
        <Card key={n}>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const EmptyState = ({ message, showBook }: { message: string; showBook?: boolean }) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No bookings found</h3>
        <p className="text-muted-foreground text-center mb-4">{message}</p>
        {showBook && (
          <Button onClick={() => navigate('/app/rooms')}>Book a Room</Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">My Bookings</h1>
          <p className="text-muted-foreground">View and manage all your room bookings</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadBookings()}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Not connected notice */}
      {!remoteReady && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4 text-sm text-amber-700 dark:text-amber-400">
            Not connected to the backend — please log in again to view your bookings.
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by room, building or purpose…"
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
            Upcoming ({isLoading ? '…' : upcomingBookings.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            History ({isLoading ? '…' : pastBookings.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Upcoming ── */}
        <TabsContent value="upcoming" className="space-y-4">
          {isLoading ? (
            <LoadingSkeleton />
          ) : applyFilters(upcomingBookings).length === 0 ? (
            <EmptyState
              message={
                searchQuery || statusFilter !== 'all'
                  ? 'No bookings match your search or filter.'
                  : "You don't have any upcoming bookings."
              }
              showBook={!searchQuery && statusFilter === 'all'}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {applyFilters(upcomingBookings).map((booking) => (
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

        {/* ── History ── */}
        <TabsContent value="history" className="space-y-4">
          {isLoading ? (
            <LoadingSkeleton />
          ) : applyFilters(pastBookings).length === 0 ? (
            <EmptyState
              message={
                searchQuery || statusFilter !== 'all'
                  ? 'No bookings match your search or filter.'
                  : 'No past bookings yet.'
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {applyFilters(pastBookings).map((booking) => (
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
