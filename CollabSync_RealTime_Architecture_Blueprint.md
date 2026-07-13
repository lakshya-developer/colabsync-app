# CollabSync Real-Time Architecture Blueprint

## Vision

CollabSync is **not** a chat application. It is an enterprise
collaboration platform where real-time communication is a platform
capability shared by every module.

The REST API is always the source of truth. Socket.IO is responsible
only for broadcasting changes after the backend has accepted, validated,
and persisted them.

------------------------------------------------------------------------

# High-Level Architecture

``` text
                Next.js Frontend
                       │
             REST + Socket.IO Client
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
   Express REST API          Socket.IO Server
        │                             │
        └──────────────┬──────────────┘
                       ▼
                 Service Layer
                       ▼
                    MongoDB
```

------------------------------------------------------------------------

# Core Principle

Never perform business logic inside Socket.IO.

Wrong:

Client → Socket → MongoDB

Correct:

Client → REST API → Service → MongoDB → Socket Emit → Clients

Only chat is allowed to originate from Socket.IO because it is
inherently real-time, but the message must still be persisted before
broadcasting.

------------------------------------------------------------------------

# Socket Responsibilities

1.  Authenticate users.
2.  Maintain active connections.
3.  Join users into rooms.
4.  Broadcast events.
5.  Handle transient events (typing, presence).
6.  Never become the primary data source.

------------------------------------------------------------------------

# Room Strategy

Every connected user automatically joins:

-   user:`<userId>`{=html}
-   company:`<companyId>`{=html}
-   team:`<teamId>`{=html}

Feature rooms are joined when required:

-   room:`<roomId>`{=html} (chat)
-   meeting:`<meetingId>`{=html}

Benefits: - Private notifications - Company announcements - Team
updates - Chat isolation - Multi-device support

------------------------------------------------------------------------

# Connection Lifecycle

Connect ↓ Verify JWT ↓ Attach socket.user ↓ Join user/company/team rooms
↓ Update presence ↓ Register events

Disconnect ↓ Update lastActive ↓ Emit offline presence

------------------------------------------------------------------------

# Folder Structure

socket-server/ ├── index.ts ├── io.ts ├── config/ ├── middleware/ ├──
events/ ├── handlers/ ├── services/ ├── emitters/ ├── utils/ └── types/

Responsibilities:

config -\> socket configuration middleware -\> auth events -\> register
listeners handlers -\> socket controllers services -\> database/business
logic emitters -\> reusable event emitters utils -\> shared helpers

------------------------------------------------------------------------

# Domain Architecture

## Company

Events: - company:update - company:announcement

## Team

Events: - team:update - team:member-added

## Task

Events: - task:created - task:updated - task:assigned - task:completed

## Room

Events: - room:join - room:leave

## Message

Events: - message:send - message:new - message:typing - message:read

## Notification

Events: - notification:new - notification:read

## Presence

Events: - presence:update

------------------------------------------------------------------------

# Request Flow

Task Assignment

Client ↓ POST /tasks ↓ Task Service ↓ MongoDB ↓ Notification Service ↓
Socket Emitter ↓ user:`<assignedUserId>`{=html} team:`<teamId>`{=html}

------------------------------------------------------------------------

# Chat Flow

Client ↓ socket.emit(message:send) ↓ Validate membership ↓ Save Message
↓ Update room metadata ↓ Emit room:`<roomId>`{=html}

------------------------------------------------------------------------

# Shared io Singleton

REST controllers should never import the Socket server directly.

Create an io singleton:

setIO(io) getIO()

Controllers call:

getIO().to("user:`<id>`{=html}").emit(...)

------------------------------------------------------------------------

# Services vs Emitters

Service - Database - Validation - Permissions

Emitter - Only broadcasts

Example:

TaskService.createTask()

↓

NotificationService.create()

↓

TaskEmitter.assigned()

------------------------------------------------------------------------

# Security

-   JWT handshake authentication
-   Room authorization before join
-   Company isolation
-   Payload validation
-   Rate limiting
-   Never trust client room IDs

------------------------------------------------------------------------

# Scaling Roadmap

Phase 1 - Single Socket.IO instance

Phase 2 - Redis Adapter - Horizontal scaling

Phase 3 - Queue notifications - Analytics - Monitoring

------------------------------------------------------------------------

# Recommended Build Order

1.  Socket foundation
2.  Authentication
3.  Connection lifecycle
4.  Room system
5.  Presence
6.  Chat
7.  Notifications
8.  Task events
9.  Admin live dashboard
10. Redis scaling

This keeps REST as the source of truth while Socket.IO acts as the
real-time delivery layer.
