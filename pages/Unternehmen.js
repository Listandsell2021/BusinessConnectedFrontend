import React from 'react';
import SinglePageForm from '../src/components/forms/SinglePageForm';

export default function UnternehmenFormPage() {
  return <SinglePageForm formType="securityCompany" />;
}

// Force server-side rendering
export async function getServerSideProps() {
  return {
    props: {}
  };
}
