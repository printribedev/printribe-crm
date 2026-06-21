"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function InvoiceByIdPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  useEffect(() => {
    if (id) router.replace(`/invoice/view?id=${encodeURIComponent(id)}`);
  }, [id, router]);

  return null;
}
