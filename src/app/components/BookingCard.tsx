import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { StatusBadge } from './StatusBadge';
import type { Booking } from '../utils/bookingsApi';
import { Calendar, Clock, MapPin, Users, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface BookingCardProps {
  booking: Booking;
  onView?: (booking: Booking) => void;
  onEdit?: (booking: Booking) => void;
  onCancel?: (booking: Booking) => void;
}

export function BookingCard({ booking, onView, onEdit, onCancel }: BookingCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold">{booking.roomName}</h3>
              <StatusBadge status={booking.status} />
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{booking.building}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(booking)}>
                  View Details
                </DropdownMenuItem>
              )}
              {onEdit && booking.status === 'pending' && (
                <DropdownMenuItem onClick={() => onEdit(booking)}>
                  Edit Booking
                </DropdownMenuItem>
              )}
              {onCancel && (booking.status === 'confirmed' || booking.status === 'pending') && (
                <DropdownMenuItem
                  onClick={() => onCancel(booking)}
                  className="text-destructive"
                >
                  Cancel Booking
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{new Date(booking.date).toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          })}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{booking.startTime} - {booking.endTime}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{booking.attendees} attendees</span>
        </div>
        <div className="pt-2 border-t">
          <p className="text-sm font-medium mb-1">Purpose:</p>
          <p className="text-sm text-muted-foreground">{booking.purpose}</p>
        </div>
      </CardContent>
    </Card>
  );
}
