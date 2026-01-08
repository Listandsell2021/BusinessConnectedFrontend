import React from 'react';
import SinglePageForm from '../src/components/forms/SinglePageForm';

export default function KundeFormPage() {
  return <SinglePageForm formType="securityClient" />;
}

// Force server-side rendering
export async function getServerSideProps() {
  return {
    props: {}
  };
}
