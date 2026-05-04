import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { BookingCard } from '../components/BookingCard';
import type { Booking } from '../utils/bookingsApi';
import { authService } from '../utils/auth';
import { bookingsApiReady, bookingsListRemote } from '../utils/bookingsApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Search, Calendar, Filter, RefreshCw, AlertCircle } from 'lucide-react';
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

  // ── Use primitive deps, NOT the currentUser object.
  // getCurrentUser() calls JSON.parse on every render → new reference every time
  // → useCallback/useEffect would loop infinitely if we used the object.
  const userId    = currentUser?.id    ?? null;
  const userName  = currentUser?.name  ?? null;
  const userEmail = currentUser?.email ?? null;
  const connected = bookingsApiReady();

  const [bookings,     setBookings]     = useState<Booking[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);   // true = show skeleton on first paint
  const [loadError,    setLoadError]    = useState<string | null>(null);
  const [refreshTick,  setRefreshTick]  = useState(0);      // increment to force a re-fetch
  const [searchQuery,  setSearchQuery]  = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // ── Data fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      navigate('/login', { replace: true });
      return;
    }

    if (!connected) {
      setBookings([]);
      setIsLoading(false);
      setLoadError('Not connected to backend — please log in again.');
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    bookingsListRemote()
      .then((rows) => {
        if (cancelled) return;

        // Case-insensitive, trimmed match against name OR email stored in the booking.
        const myName  = (userName  || '').toLowerCase().trim();
        const myEmail = (userEmail || userId || '').toLowerCase().trim();

        const mine = rows.filter((b) => {
          const stored = (b.userName || '').toLowerCase().trim();
          return stored === myName || stored === myEmail;
        });

        setBookings(mine);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('Could not load bookings. Check your connection and try again.');
        setIsLoading(false);
      });

    return () => { cancelled = true; };
  // refreshTick lets the Refresh button force a new fetch without other dep changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userName, userEmail, connected, refreshTick]);

  if (!currentUser) return null;

  // ── Sorting / bucketing ───────────────────────────────────────────────────
  const isUpcoming = (b: Booking) =>
    new Date(`${b.date}T12:00:00`) >= new Date() &&
    b.status !== 'cancelled' &&
    b.status !== 'rejected';

  const upcomingBookings = [...bookings]
    .filter(isUpcoming)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const historyBookings = [...bookings]
    .filter((b) => !isUpcoming(b))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ── Client-side search / status filter ────────────────────────────────────
  const applyFilters = (list: Booking[]) =>
    list.filter((b) => {
      const q = searchQuery.toLowerCase();
      if (q && !b.roomName.toLowerCase().includes(q) &&
               !(b.building || '').toLowerCase().includes(q) &&
               !b.purpose.toLowerCase().includes(q)) return false;
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      return true;
    });

  // ── Sub-components ────────────────────────────────────────────────────────
  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((n) => (
        <Card key={n}>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const EmptyState = ({ tab }: { tab: 'upcoming' | 'history' }) => (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No bookings found</h3>
        <p className="text-muted-foreground mb-4">
          {searchQuery || statusFilter !== 'all'
            ? 'No bookings match your current search or filter.'
            : tab === 'upcoming'
            ? "You don't have any upcoming room bookings."
            : 'No past or rejected bookings yet.'}
        </p>
        {tab === 'upcoming' && !searchQuery && statusFilter === 'all' && (
          <Button onClick={() => navigate('/app/rooms')}>Book a Room</Button>
        )}
      </CardContent>
    </Card>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">My Bookings</h1>
          <p className="text-muted-foreground">View and manage all your room bookings</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshTick((t: number) => t + 1)}
          disabled={isLoading}
          className="shrink-0 gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error banner */}
      {loadError && !isLoading && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{loadError}</p>
          </CardContent>
        </Card>
      )}

      {/* Search + filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by room, building or purpose…"
            value={searchQuery}
            onChange={(e: { target: { value: string } }) => setSearchQuery(e.target.value)}
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
            Upcoming&nbsp;
            <span className="ml-1 rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
              {isLoading ? '…' : upcomingBookings.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="history">
            History&nbsp;
            <span className="ml-1 rounded-full bg-muted px-2 text-xs font-semibold text-muted-foreground">
              {isLoading ? '…' : historyBookings.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Upcoming */}
        <TabsContent value="upcoming" className="space-y-4">
          {isLoading ? (
            <LoadingSkeleton />
          ) : applyFilters(upcomingBookings).length === 0 ? (
            <EmptyState tab="upcoming" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {applyFilters(upcomingBookings).map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onView={() => toast.info('Detail view coming soon!')}
                  onEdit={() => toast.info('Edit coming soon!')}
                  onCancel={() => toast.success(`Booking for ${booking.roomName} cancelled.`)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="space-y-4">
          {isLoading ? (
            <LoadingSkeleton />
          ) : applyFilters(historyBookings).length === 0 ? (
            <EmptyState tab="history" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {applyFilters(historyBookings).map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onView={() => toast.info('Detail view coming soon!')}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
