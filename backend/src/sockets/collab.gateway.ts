import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class CollabGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private userSocketMap = new Map<string, string>();

  afterInit() {
    console.log('WebSocket server initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // console.log(`Client disconnected: ${client.id}`);
    // Remove user from the map when they disconnect
    for (const [userId, socketId] of this.userSocketMap.entries()) {
      if (socketId === client.id) {
        this.userSocketMap.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('registerUser')
  handleRegisterUser(client: Socket, userId: string): void {
    console.log(`fromm collab.gateway`);
    this.userSocketMap.set(userId, client.id);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, room: string): void {
    // console.log(`Client ${client.id} joined room ${room}`);
    client.join(room);
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(client: Socket, room: string): void {
    // console.log(`Client ${client.id} left room ${room}`);
    client.leave(room);
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(
    client: Socket,
    payload: { room: string; message: any; senderId: string },
  ): void {
    const { room, message, senderId } = payload;
    // console.log(
    //   `Message from ${client.id} in collab ${room}:`,
    //   JSON.stringify(message),
    // );

    // Get the socket ID of the sender
    const senderSocketId = this.userSocketMap.get(senderId);
    console.log(`Emitted 'newMessage' to room ${room} (excluding sender)`);
    // Ensure that the senderSocketId is not null or undefined
    if (senderSocketId) {
      this.server
        .to(room)
        .except(senderSocketId) // Exclude the sender
        .emit('newMessage', { message, senderId });
    } else {
      console.log(`Sender socket ID not found for user ${senderId}`);
    }
  }

  public getSocketId(userId: string): string | undefined {
    return this.userSocketMap.get(userId);
  }

  // Public method to check if a user is in a specific room
  public isUserInRoom(userId: string, room: string): boolean {
    const socketId = this.userSocketMap.get(userId);
    if (!socketId) return false;
    const clientSockets = this.server.sockets.sockets;
    const socket = clientSockets.get(socketId);
    return socket && socket.rooms.has(room);
  }
}
