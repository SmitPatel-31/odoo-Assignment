import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Grid, Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import dayjs from 'dayjs';

const BookComponent = ({ room, open, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const handleDateChange = (date) => {
    setSelectedDate(date);
    // Reset selected slot when date changes
    setSelectedSlot(null);
  };

  const handleSlotSelection = (timeSlot) => {
    setSelectedSlot(timeSlot);
  };

  const handleBookRoom = () => {
    // Handle booking the room with the selected date and time slot
    // You can implement the booking logic here
    // For demonstration, let's just log the selected date and time slot
    console.log("Selected Date:", selectedDate);
    console.log("Selected Time Slot:", selectedSlot);
    const date = { 'm': selectedDate.$M, 'd': selectedDate.$D, 'y': selectedDate.$y, 'time': selectedSlot }
    room.bookings.push(date)
    console.log(room)
    const url = `http://127.0.0.1:8000/updateroom/${room.roomNo}`;

    // Perform the PATCH request
    fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(room)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to update room booking');
        }
        // Close the dialog if the update is successful
        onClose();
      })
      .catch(error => {
        console.error('Error updating room booking:', error);
        // Handle error scenarios
      });
    // Close the dialog
    onClose();
  };

  // Generate mock time slots
  const timeSlots = ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM'];

  // const currentMonthStart = dayjs().startOf('month');
  const currentMonthEnd = dayjs().endOf('month');
  const currentDate = dayjs();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Book Room</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} alignItems="center">
          {/* Left side: Date selection */}
          <Grid item xs={8} md={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <StaticDatePicker
                label="Select Date"
                value={selectedDate}
                onChange={handleDateChange}
                fullWidth
                minDate={currentDate}
                maxDate={currentMonthEnd}
              />
            </LocalizationProvider>
          </Grid>
          {/* Right side: Room details, slot selection, and book button */}
          <Grid item xs={8} md={6}>
            <Box overflow="auto">
              <Grid container spacing={2} direction="column">
                {/* Room details */}
                <Grid item>
                  <Typography variant="h6">Room Details</Typography>
                  <Typography variant="body1">Room Number: {room.roomNo}</Typography>
                  <Typography variant="body1">Capacity: {room.capacity}</Typography>
                </Grid>
                {/* Slot selection */}
                <Grid item>
                  {selectedDate && (
                    <Typography variant="h6">Select Time Slot</Typography>
                  )}
                  {selectedDate && (
                    <Grid container spacing={1}>
                     {timeSlots.map((timeSlot, index) => (
    <Grid item key={index} xs={4} sm={3} md={3}>
       <Button
    fullWidth
    variant={selectedSlot === timeSlot ? "contained" : "outlined"}
    disabled={room.bookings.some(booking => (
        booking.d === selectedDate.$D &&
        booking.m === selectedDate.$M &&
        booking.y === selectedDate.$y &&
        booking.time === timeSlot
    ))}
    onClick={() => handleSlotSelection(timeSlot)}
>
    {timeSlot}
</Button>
    </Grid>
))}


                    </Grid>
                  )}
                </Grid>
                {/* Book button */}
                <Grid item>
                  {selectedSlot && (
                    <Button variant="contained" color="primary" onClick={handleBookRoom} fullWidth>
                      Book Room
                    </Button>
                  )}
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
export default BookComponent;
