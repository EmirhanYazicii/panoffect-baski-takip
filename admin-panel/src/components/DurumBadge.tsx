import { IsDurumu, durumEtiketleri, durumRenkleri } from "../lib/types";

export default function DurumBadge({ durum }: { durum: IsDurumu }) {
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium text-white ${durumRenkleri[durum]}`}
    >
      {durumEtiketleri[durum]}
    </span>
  );
}
