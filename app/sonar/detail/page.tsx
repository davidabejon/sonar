import React, { Suspense } from 'react';
import DetailClient from './DetailClient';

export default function Page() {
  return (
    <Suspense fallback={<div style={{padding:20}}>Cargando...</div>}>
      <DetailClient />
    </Suspense>
  );
}
