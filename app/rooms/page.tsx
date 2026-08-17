import { requirePokerIdentity } from "../chatgpt-auth";
import { RoomsClient } from "./rooms-client";

export const dynamic = "force-dynamic";

export default async function RoomsPage() {
  const identity = await requirePokerIdentity("/rooms");
  return <RoomsClient playerName={identity.displayName} />;
}
