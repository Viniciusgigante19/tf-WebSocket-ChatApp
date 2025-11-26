import { WebSocketServer } from "ws";
import chalk from "chalk";
import { initRooms, joinRoom, leaveRoom, broadcastToRoom } from "./_rooms.js";

const SOCKET_PORT = Number(process.env.SOCKET_PORT ?? 8081);
const websocket = new WebSocketServer({ port: SOCKET_PORT });

// Inicializa salas pré-definidas
await initRooms();

websocket.on("connection", (ws) => {
    console.log(chalk.cyan("Cliente conectado.."));

    ws.on("message", (raw) => {
        const text = raw.toString();
        console.log(chalk.yellow("Do client:"), text);

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            console.log("Mensagem não é JSON válido, ignorando.");
            return;
        }

        // --- JOIN em uma sala ---
        if (data.type === "join" && data.name && data.room) {
            ws.userName = data.name;
            joinRoom(data.room, ws);

            broadcastToRoom(data.room, {
                type: "join",
                name: ws.userName,
            });

            return;
        }

        // --- MESSAGE ---
        if (data.type === "message" && data.name && data.text && ws.room) {
            broadcastToRoom(ws.room, {
                type: "message",
                name: ws.userName,
                text: data.text,
            });

            return;
        }

        console.log("Tipo de mensagem desconhecido vindo do client:", data);
    });

    // --- CLOSE ---
    ws.on("close", () => {
        console.log(chalk.gray("Cliente desconectado."));
        if (ws.userName && ws.room) {
            leaveRoom(ws.room, ws);

            broadcastToRoom(ws.room, {
                type: "leave",
                name: ws.userName,
            });
        }
    });
});

console.log(
    chalk.greenBright(
        `WebSocket rodando na porta ${SOCKET_PORT} com suporte a múltiplas salas.`
    )
);
