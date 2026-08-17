import { notFound } from "next/navigation";
import { requirePokerIdentity } from "../../chatgpt-auth";
import { MultiplayerDoudizhu } from "./room-client";

export const dynamic = "force-dynamic";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const code = (await params).code.toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(code)) notFound();
  const identity = await requirePokerIdentity(`/room/${code}`);
  return <MultiplayerDoudizhu code={code} playerName={identity.displayName} />;
}
