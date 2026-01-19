import { io } from "socket.io-client";

export const initSocket = async () => {
  return io({
    path: "/socket.io",
    transports: ["websocket"],
    secure: true,
    forceNew: true,
    reconnectionAttempts: Infinity,
    timeout: 20000,
  });
};
