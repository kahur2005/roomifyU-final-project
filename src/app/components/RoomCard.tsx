import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { StatusBadge } from './StatusBadge';
import type { Room } from '../data/mockData';
import { MapPin, Users, Star } from 'lucide-react';
import { useNavigate } from 'react-router';

interface RoomCardProps {
  room: Room;
  onFavorite?: (roomId: string) => void;
  isFavorite?: boolean;
}

export function RoomCard({ room, onFavorite, isFavorite = false }: RoomCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 overflow-hidden">
        <img
          src={room.image}
          alt={room.name}
          className="w-full h-full object-cover"
        />
        {onFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite(room.id);
            }}
            className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
          >
            <Star
              className={`h-5 w-5 ${isFavorite ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`}
            />
          </button>
        )}
        {room.isMaintenance ? (
          <div className="absolute top-3 left-3">
            <StatusBadge status="maintenance" />
          </div>
        ) : (
          <div className="absolute top-3 left-3">
            <StatusBadge status={room.isAvailable ? 'available' : 'booked'} />
          </div>
        )}
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{room.name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="h-4 w-4" />
              <span>{room.building}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Users className="h-4 w-4" />
          <span>Capacity: {room.capacity}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {room.facilities.slice(0, 4).map((facility) => (
            <span
              key={facility}
              className="text-xs px-2 py-1 bg-muted rounded-md"
            >
              {facility}
            </span>
          ))}
          {room.facilities.length > 4 && (
            <span className="text-xs px-2 py-1 bg-muted rounded-md">
              +{room.facilities.length - 4} more
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => navigate(`/app/room/${room.id}`)}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
