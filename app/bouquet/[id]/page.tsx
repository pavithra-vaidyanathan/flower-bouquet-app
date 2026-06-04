import { BouquetView } from "@/components/fleur/BouquetView";

type Props = { params: { id: string } };

export default function BouquetPage({ params }: Props) {
  return <BouquetView bouquetId={params.id} />;
}
