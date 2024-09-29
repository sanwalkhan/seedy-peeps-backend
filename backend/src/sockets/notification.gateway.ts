import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CollabGateway } from './collab.gateway';

@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private userSocketMap = new Map<string, string>();

  constructor(private readonly collabGateway: CollabGateway) {}

  afterInit() {
    console.log('WebSocket server initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.userSocketMap.forEach((socketId, userId) => {
      if (socketId === client.id) {
        this.userSocketMap.delete(userId);
        console.log(`Removed user ${userId} from userSocketMap`);
      }
    });
    console.log('Updated userSocketMap:', this.userSocketMap);
  }

  @SubscribeMessage('registerUser')
  handleRegisterUser(client: Socket, userId: string): void {
    if (this.userSocketMap.has(userId)) {
      console.log(
        `User ${userId} is already registered with socket ${this.userSocketMap.get(userId)}`,
      );
      return;
    }
    console.log(`User ${userId} registered with socket ${client.id}`);
    this.userSocketMap.set(userId, client.id);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket): void {
    console.log(`Ping received from client: ${client.id}`);
    console.log('clienttttttttttt', client.id);
    client.emit('pong', client.id);
  }

  getSocketId(userId: string): string | undefined {
    return this.userSocketMap.get(userId);
  }

  public async notifyUser(userId: string, message: any) {
    const socketId = this.userSocketMap.get(userId);
    if (socketId) {
      console.log(
        `Notifying user ${userId} with message: ${JSON.stringify(message)}`,
      );
      this.server.to(socketId).emit('notification', message);
    } else {
      console.log(`No socket ID found for user ${userId}`);
    }
  }

  public async notifyMembers(
    members: string[],
    senderId: string,
    message: any,
  ) {
    console.log('Starting notification process for members:', members);

    const filteredMembers = members.filter(
      (memberId) => memberId !== senderId.toString(),
    );

    console.log('Filtered Members:', filteredMembers);

    for (const memberId of filteredMembers) {
      if (!this.collabGateway.isUserInRoom(memberId, message.collab.id)) {
        const socketId = this.getSocketId(memberId);
        if (socketId) {
          console.log(
            `Sending notification to member ${memberId} with socket ID ${socketId}`,
          );
          this.server.to(socketId).emit('notifyMembers', message);
          console.log(`Notification sent to member ${memberId}:`, message);
        } else {
          console.log(`No socket ID found for member ${memberId}`);
        }
      } else {
        console.log(`Member ${memberId} is already in the room.`);
      }
    }
  }
}
