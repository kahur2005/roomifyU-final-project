import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { rooms, generateTimeSlots } from '../data/mockData';
import { bookingsApiReady, bookingCreateRemote, getRoomAvailabilityRemote, type AvailabilitySlot } from '../utils/bookingsApi';
import { authService } from '../utils/auth';
import { addNotification } from '../utils/notificationsStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { StatusBadge } from '../components/StatusBadge';
import { MapPin, Users, Star, ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Calendar } from '../components/ui/calendar';
import { toast } from 'sonner';

type RoomAvailabilitySlot = {
  time: string;
  status: 'available' | 'booked' | 'pending';
};

export function RoomDetailPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const room = rooms.find(r => r.id === roomId);
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);

  // Booking form state
  const [selectedTime, setSelectedTime] = useState({ start: '', end: '' });
  const [purpose, setPurpose] = useState('');
  const [attendees, setAttendees] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[] | null>(null);

  const formatLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const timeSlotsMemo = useMemo(() => generateTimeSlots(), []);
  const sheetBackendReady =
    authService.gasBackendConfigured() && authService.isGasSession();

  useEffect(() => {
    if (!room || !sheetBackendReady) {
      setAvailabilitySlots(null);
      setAvailabilityLoading(false);
      return;
    }

    setAvailabilityLoading(true);
    void getRoomAvailabilityRemote(room.id, formatLocalDate(selectedDate))
      .then((slots) => {
        setAvailabilitySlots(slots);
      })
      .catch(() => {
        setAvailabilitySlots(null);
      })
      .finally(() => setAvailabilityLoading(false));
  }, [room, selectedDate, sheetBackendReady]);

  if (!room) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold mb-4">Room not found</h2>
        <Button onClick={() => navigate('/app/rooms')}>Back to Rooms</Button>
      </div>
    );
  }

  const timeSlots = timeSlotsMemo;

  const mockAvailability: RoomAvailabilitySlot[] = timeSlots.map((time, index) => ({
    time,
    status: (room.isMaintenance
      ? 'pending'
      : !room.isAvailable
      ? 'booked'
      : index % 6 === 0
      ? 'pending'
      : index % 4 === 0
      ? 'booked'
      : 'available') as AvailabilitySlot['status'],
  }));

  const availability: (RoomAvailabilitySlot | AvailabilitySlot)[] = availabilitySlots ?? mockAvailability;

  const handleEquipmentToggle = (equipment: string) => {
    setSelectedEquipment(prev =>
      prev.includes(equipment) ? prev.filter(e => e !== equipment) : [...prev, equipment]
    );
  };

  const handleBookingSubmit = async () => {
    const dateStr = formatLocalDate(selectedDate);
    const n = Number(attendees);
    const attendeesNum = Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;

    const user = authService.getCurrentUser();
    if (bookingsApiReady()) {
      const created = await bookingCreateRemote({
        roomId: room.id,
        roomName: room.name,
        building: room.building,
        date: dateStr,
        startTime: selectedTime.start,
        endTime: selectedTime.end,
        purpose,
        attendees: attendeesNum,
        equipment: selectedEquipment,
        notes,
        isRecurring,
      });
      if (!created) {
        toast.error('Could not submit booking.');
        return;
      }
      toast.success('Booking request submitted successfully!');
    } else {
      toast.success('Booking request submitted successfully!');
    }

    if (user) {
      addNotification(user.id, {
        type: 'booking',
        title: 'Booking Pending',
        message: `Your booking for ${room.name} on ${new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} (${selectedTime.start}–${selectedTime.end}) is now pending approval.`,
        link: '/app/bookings',
      });
    }

    setShowBookingModal(false);
    setBookingStep(1);
    setSelectedTime({ start: '', end: '' });
    setPurpose('');
    setAttendees('');
    setSelectedEquipment([]);
    setIsRecurring(false);
    setNotes('');
    navigate('/app/bookings');
  };

  const renderBookingStep = () => {
    switch (bookingStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => date < new Date()}
                className="rounded-md border"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={selectedTime.start}
                  onChange={(e) => setSelectedTime(prev => ({ ...prev, start: e.target.value }))}
                >
                  <option value="">Select time</option>
                  {timeSlots.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={selectedTime.end}
                  onChange={(e) => setSelectedTime(prev => ({ ...prev, end: e.target.value }))}
                >
                  <option value="">Select time</option>
                  {timeSlots.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Purpose of Booking</Label>
              <Input
                placeholder="e.g., Study Group, Workshop, Meeting"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Number of Attendees</Label>
              <Input
                type="number"
                placeholder="Enter number of attendees"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                max={room.capacity}
              />
              <p className="text-xs text-muted-foreground">
                Room capacity: {room.capacity}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Equipment Needed</Label>
              <div className="space-y-2">
                {room.facilities.map(facility => (
                  <div key={facility} className="flex items-center space-x-2">
                    <Checkbox
                      id={`eq-${facility}`}
                      checked={selectedEquipment.includes(facility)}
                      onCheckedChange={() => handleEquipmentToggle(facility)}
                    />
                    <label htmlFor={`eq-${facility}`} className="text-sm cursor-pointer">
                      {facility}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
              />
              <label htmlFor="recurring" className="text-sm cursor-pointer">
                Make this a recurring booking
              </label>
            </div>
            <div className="space-y-2">
              <Label>Additional Notes (Optional)</Label>
              <Textarea
                placeholder="Any special requirements or notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h3 className="font-semibold">Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Room:</span>
                  <span className="font-medium">{room.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Building:</span>
                  <span className="font-medium">{room.building}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">{selectedTime.start} - {selectedTime.end}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purpose:</span>
                  <span className="font-medium">{purpose}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Attendees:</span>
                  <span className="font-medium">{attendees}</span>
                </div>
                {selectedEquipment.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Equipment:</span>
                    <span className="font-medium">{selectedEquipment.join(', ')}</span>
                  </div>
                )}
                {isRecurring && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recurring:</span>
                    <span className="font-medium">Yes</span>
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your booking request will be sent for approval. You'll receive a notification once it's reviewed.
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/app/rooms')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Rooms
      </Button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Room Images and Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Room Image */}
          <div className="relative h-96 rounded-xl overflow-hidden">
            <img
              src={room.image}
              alt={room.name}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
            >
              <Star
                className={`h-6 w-6 ${isFavorite ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`}
              />
            </button>
          </div>

          {/* Room Details */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{room.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {room.building}, Floor {room.floor}
                    </span>
                  </div>
                </div>
                {room.isMaintenance ? (
                  <StatusBadge status="maintenance" />
                ) : (
                  <StatusBadge status={room.isAvailable ? 'available' : 'booked'} />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span>Capacity: <strong>{room.capacity}</strong> people</span>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Available Facilities</h3>
                <div className="flex flex-wrap gap-2">
                  {room.facilities.map(facility => (
                    <span
                      key={facility}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-md text-sm"
                    >
                      {facility}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground capitalize">
                  Room Type: <strong className="text-foreground">{room.type.replace('-', ' ')}</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Availability Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Availability</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                {sheetBackendReady && (
                  <span className="block mt-1 text-xs">
                    {availabilityLoading
                      ? 'Loading availability…'
                      : availabilitySlots && availabilitySlots.length > 0
                      ? 'Live schedule from Apps Script backend'
                      : 'No live availability loaded yet'}
                  </span>
                )}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-accent rounded"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-destructive rounded"></div>
                  <span>Booked</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-amber-500 rounded"></div>
                  <span>Pending</span>
                </div>
              </div>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {availability.map(({ time, status }) => (
                  <button
                    key={time}
                    className={`p-2 rounded text-xs font-medium transition-colors ${
                      status === 'available'
                        ? 'bg-accent/10 text-accent hover:bg-accent/20'
                        : status === 'booked'
                        ? 'bg-destructive/10 text-destructive cursor-not-allowed'
                        : 'bg-amber-500/10 text-amber-700 cursor-not-allowed'
                    }`}
                    disabled={status !== 'available'}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sticky Booking Section */}
        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle>Book This Room</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full"
                size="lg"
                onClick={() => setShowBookingModal(true)}
                disabled={room.isMaintenance || !room.isAvailable}
              >
                <CalendarIcon className="h-5 w-5 mr-2" />
                {room.isMaintenance ? 'Under Maintenance' : !room.isAvailable ? 'Not Available' : 'Book Now'}
              </Button>
              
              <div className="text-sm space-y-2">
                <p className="text-muted-foreground">
                  Booking requests are typically reviewed within 24 hours.
                </p>
                <p className="text-muted-foreground">
                  Maximum booking duration: 4 hours
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Book {room.name} - Step {bookingStep} of 3
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {renderBookingStep()}
          </div>

          <div className="flex justify-between mt-6">
            {bookingStep > 1 && (
              <Button variant="outline" onClick={() => setBookingStep(bookingStep - 1)}>
                Previous
              </Button>
            )}
            {bookingStep < 3 ? (
              <Button
                onClick={() => setBookingStep(bookingStep + 1)}
                className="ml-auto"
                disabled={
                  (bookingStep === 1 && (!selectedTime.start || !selectedTime.end)) ||
                  (bookingStep === 2 && (!purpose || !attendees))
                }
              >
                Next
              </Button>
            ) : (
              <Button onClick={handleBookingSubmit} className="ml-auto">
                Confirm Booking
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}