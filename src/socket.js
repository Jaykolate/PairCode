import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.PROD ? undefined : "http://localhost:10000");

export const initSocket = async () => {
  return io(BACKEND_URL, {
    path: "/socket.io",
    transports: ["websocket"],
    forceNew: true,
    reconnectionAttempts: Infinity,
    timeout: 20000,
  });
};