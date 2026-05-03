import React, { useState } from 'react';
import { rooms, buildings, allFacilities } from '../data/mockData';
import { authService } from '../utils/auth';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { StatusBadge } from '../components/StatusBadge';
import { Checkbox } from '../components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Search, Plus, Edit, Trash2, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '../components/ui/switch';

export function RoomManagementPage() {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();

  if (!currentUser || currentUser.role !== 'admin') {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('All Buildings');
  const [showAddEditDialog, setShowAddEditDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<typeof rooms[0] | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    building: '',
    floor: 1,
    capacity: 20,
    type: 'classroom' as const,
    facilities: [] as string[],
    isMaintenance: false
  });

  const filteredRooms = rooms.filter(room => {
    if (searchQuery && !room.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (buildingFilter !== 'All Buildings' && room.building !== buildingFilter) {
      return false;
    }
    return true;
  });

  const handleAddRoom = () => {
    setEditingRoom(null);
    setFormData({
      name: '',
      building: '',
      floor: 1,
      capacity: 20,
      type: 'classroom',
      facilities: [],
      isMaintenance: false
    });
    setShowAddEditDialog(true);
  };

  const handleEditRoom = (room: typeof rooms[0]) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      building: room.building,
      floor: room.floor,
      capacity: room.capacity,
      type: room.type,
      facilities: room.facilities,
      isMaintenance: room.isMaintenance
    });
    setShowAddEditDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRoom) {
      toast.success(`Room ${formData.name} has been updated.`);
    } else {
      toast.success(`Room ${formData.name} has been added.`);
    }
    setShowAddEditDialog(false);
  };

  const handleDeleteRoom = (room: typeof rooms[0]) => {
    if (confirm(`Are you sure you want to delete ${room.name}?`)) {
      toast.success(`Room ${room.name} has been deleted.`);
    }
  };

  const handleFacilityToggle = (facility: string) => {
    setFormData(prev => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter(f => f !== facility)
        : [...prev.facilities, facility]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Room Management</h1>
          <p className="text-muted-foreground">
            Add, edit, and manage all university rooms
          </p>
        </div>
        <Button onClick={handleAddRoom}>
          <Plus className="h-4 w-4 mr-2" />
          Add Room
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={buildingFilter} onValueChange={setBuildingFilter}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {buildings.map(building => (
              <SelectItem key={building} value={building}>
                {building}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Rooms Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Rooms ({filteredRooms.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room Name</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No rooms found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.name}</TableCell>
                      <TableCell>{room.building}</TableCell>
                      <TableCell>{room.floor}</TableCell>
                      <TableCell>{room.capacity}</TableCell>
                      <TableCell className="capitalize">
                        {room.type.replace('-', ' ')}
                      </TableCell>
                      <TableCell>
                        {room.isMaintenance ? (
                          <StatusBadge status="maintenance" />
                        ) : room.isAvailable ? (
                          <StatusBadge status="available" />
                        ) : (
                          <StatusBadge status="booked" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRoom(room)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteRoom(room)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Room Dialog */}
      <Dialog open={showAddEditDialog} onOpenChange={setShowAddEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? 'Edit Room' : 'Add New Room'}
            </DialogTitle>
            <DialogDescription>
              {editingRoom ? 'Update room information' : 'Add a new room to the system'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room-name">Room Name/Number *</Label>
                <Input
                  id="room-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Room 301"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="building">Building *</Label>
                <Select
                  value={formData.building}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, building: value }))}
                  required
                >
                  <SelectTrigger id="building">
                    <SelectValue placeholder="Select building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.filter(b => b !== 'All Buildings').map(building => (
                      <SelectItem key={building} value={building}>
                        {building}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="floor">Floor *</Label>
                <Input
                  id="floor"
                  type="number"
                  min="0"
                  value={formData.floor}
                  onChange={(e) => setFormData(prev => ({ ...prev, floor: parseInt(e.target.value) }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Room Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                required
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classroom">Classroom</SelectItem>
                  <SelectItem value="lecture-hall">Lecture Hall</SelectItem>
                  <SelectItem value="lab">Lab</SelectItem>
                  <SelectItem value="meeting-room">Meeting Room</SelectItem>
                  <SelectItem value="seminar-room">Seminar Room</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Facilities</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 border rounded-lg">
                {allFacilities.map(facility => (
                  <div key={facility} className="flex items-center space-x-2">
                    <Checkbox
                      id={`facility-${facility}`}
                      checked={formData.facilities.includes(facility)}
                      onCheckedChange={() => handleFacilityToggle(facility)}
                    />
                    <label htmlFor={`facility-${facility}`} className="text-sm cursor-pointer">
                      {facility}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="maintenance">Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Mark this room as under maintenance
                </p>
              </div>
              <Switch
                id="maintenance"
                checked={formData.isMaintenance}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isMaintenance: checked }))}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddEditDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingRoom ? 'Update Room' : 'Add Room'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
