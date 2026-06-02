module.exports = (io, socket) => {
  socket.on("join_now", (roomId) => {
    socket.join(roomId);
    
    console.log(`Joined room ${roomId}`);
  });

  socket.on("send_message", async (data) => {
    const messageData = {
      senderId: socket.user.userId,
      roomId: data.roomId,
      content: data.content,
      createdId: new Date(),
    };

    io.to(data.roomId).emit("receive_message", messageData);
  });
};
