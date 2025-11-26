import { getConnection } from "./config/rabbit.js";

const roomChannels = {};  // canais RabbitMQ por sala
const roomClients = {};   // clientes WebSocket por sala

// Salas pré-definidas
const predefinedRooms = ["sala_aula", "sala_trabalho"];

/**
 * Inicializa todas as salas pré-definidas
 */
export async function initRooms() {
    const channel = await getConnection();

    for (const roomName of predefinedRooms) {
        // Exchange fanout da sala
        await channel.assertExchange(roomName, "fanout", { durable: true });

        // Inicializa arrays de clientes
        roomClients[roomName] = [];
        roomChannels[roomName] = channel;
    }
}

/**
 * Adiciona cliente a uma sala
 */
export function joinRoom(roomName, ws) {
    if (!roomClients[roomName]) roomClients[roomName] = [];
    if (!roomClients[roomName].includes(ws)) {
        ws.room = roomName;
        roomClients[roomName].push(ws);
    }
}

/**
 * Remove cliente de uma sala
 */
export function leaveRoom(roomName, ws) {
    if (!roomClients[roomName]) return;
    roomClients[roomName] = roomClients[roomName].filter(c => c !== ws);
    ws.room = null;
}

/**
 * Lista todas as salas existentes
 */
export function listRooms() {
    return Object.keys(roomChannels);
}

/**
 * Publica mensagem para todos os clientes de uma sala
 */
export function broadcastToRoom(roomName, payload) {
    if (!roomClients[roomName]) return;
    const message = JSON.stringify(payload);

    roomClients[roomName].forEach(client => {
        if (client.readyState === client.OPEN) client.send(message);
    });

    // Também publica no RabbitMQ
    const channel = roomChannels[roomName];
    if (channel) {
        channel.publish(roomName, "", Buffer.from(JSON.stringify(payload)));
    }
}
