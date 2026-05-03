import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Room } from '../data/mockData';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { StatusBadge } from './StatusBadge';
import { MapPin, Users, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';

interface RoomCarouselProps {
  rooms: Room[];
  onFavorite?: (roomId: string) => void;
  favoriteRooms?: string[];
}

export function RoomCarousel({ rooms, onFavorite, favoriteRooms = [] }: RoomCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();

  if (rooms.length === 0) {
    return null;
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? rooms.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === rooms.length - 1 ? 0 : prev + 1));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getVisibleRooms = () => {
    const visible = [];
    const positions = [-1, 0, 1];

    for (const offset of positions) {
      const index = (currentIndex + offset + rooms.length) % rooms.length;
      visible.push({ room: rooms[index], offset, index });
    }

    return visible;
  };

  const visibleRooms = getVisibleRooms();

  return (
    <div className="relative w-full">
      {/* Background Decoration */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-2xl" />

      {/* Carousel Container */}
      <motion.div
        className="relative h-[600px] flex items-center justify-center overflow-hidden px-8 py-8"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onDragEnd={(e, { offset, velocity }) => {
          const swipe = Math.abs(offset.x) * velocity.x;

          if (swipe < -1000) {
            handleNext();
          } else if (swipe > 1000) {
            handlePrevious();
          }
        }}
      >
        <AnimatePresence mode="popLayout">
          {visibleRooms.map(({ room, offset, index }) => {
            const isFavorite = favoriteRooms.includes(room.id);
            const isCenter = offset === 0;

            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, scale: 0.8, x: offset * 400 }}
                animate={{
                  opacity: isCenter ? 1 : 0.5,
                  scale: isCenter ? 1.05 : 0.85,
                  x: offset * 400,
                  y: isCenter ? -10 : 0,
                  zIndex: isCenter ? 10 : 1,
                  filter: isCenter ? 'blur(0px)' : 'blur(2px)',
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  duration: 0.6,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                whileHover={
                  !isCenter
                    ? {
                        scale: 0.9,
                        opacity: 0.7,
                      }
                    : undefined
                }
                className="absolute cursor-pointer"
                style={{
                  pointerEvents: 'auto',
                }}
                onClick={() => {
                  if (!isCenter && offset !== 0) {
                    if (offset > 0) handleNext();
                    else handlePrevious();
                  }
                }}
              >
                <Card className={`w-[350px] overflow-hidden transition-all duration-300 ${
                  isCenter
                    ? 'shadow-2xl ring-2 ring-primary/20'
                    : 'shadow-md hover:shadow-lg'
                }`}>
                  <div className="relative h-56 overflow-hidden">
                    <motion.img
                      src={room.image}
                      alt={room.name}
                      className="w-full h-full object-cover"
                      animate={{
                        scale: isCenter ? 1 : 1.1,
                      }}
                      transition={{ duration: 0.5 }}
                    />
                    {onFavorite && isCenter && (
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
                        <h3 className="font-semibold text-lg">{room.name}</h3>
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
                  {isCenter && (
                    <CardFooter>
                      <Button
                        className="w-full"
                        onClick={() => navigate(`/app/room/${room.id}`)}
                      >
                        View Details
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-center gap-4 mt-8">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrevious}
          className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <div className="flex items-center gap-2">
          {rooms.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          className="h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* Room Counter & Navigation Hints */}
      <div className="flex flex-col items-center gap-2 mt-4">
        <div className="text-sm text-muted-foreground">
          Room {currentIndex + 1} of {rooms.length}
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 text-xs text-muted-foreground/60">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded text-xs">←</kbd>
            <span>Arrow keys</span>
            <kbd className="px-2 py-1 bg-muted rounded text-xs">→</kbd>
          </div>
          <span className="hidden sm:inline">•</span>
          <span>Swipe or click side cards</span>
        </div>
      </div>
    </div>
  );
}
