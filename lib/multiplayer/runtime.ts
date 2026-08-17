import { env } from "cloudflare:workers";

type RoomEnvironment = {
  ROOM_SERVICE_URL?: string;
  ROOM_SERVICE_SECRET?: string;
};

function roomEnvironment() {
  return env as unknown as RoomEnvironment;
}

export function roomServiceUrl() {
  const value =
    roomEnvironment().ROOM_SERVICE_URL ?? process.env.ROOM_SERVICE_URL;
  if (!value) throw new Error("ROOM_SERVICE_URL is unavailable");
  return value.replace(/\/$/, "");
}

export function roomServiceSecret() {
  const value =
    roomEnvironment().ROOM_SERVICE_SECRET ?? process.env.ROOM_SERVICE_SECRET;
  if (!value) throw new Error("ROOM_SERVICE_SECRET is unavailable");
  return value;
}
