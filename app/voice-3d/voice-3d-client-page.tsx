"use client";

import dynamic from "next/dynamic";

const Voice3DPage = dynamic(() => import("@/views/Voice3DPage"), {
  ssr: false,
});

export default function Voice3DClientPage() {
  return <Voice3DPage />;
}
