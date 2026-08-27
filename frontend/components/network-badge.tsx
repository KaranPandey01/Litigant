import { cn } from "@/lib/utils";
import type { Network } from "@/lib/types";

const networkConfig: Record<
  Network,
  { label: string; className: string }
> = {
  visa: {
    label: "Visa",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  mastercard: {
    label: "Mastercard",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  rupay: {
    label: "RuPay",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
};

export function NetworkBadge({ network }: { network: Network }) {
  const config = networkConfig[network] ?? {
    label: network,
    className: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold capitalize",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
