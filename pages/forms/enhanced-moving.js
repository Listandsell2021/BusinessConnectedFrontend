import React from 'react';
import EnhancedMultiStepForm from '../../src/components/forms/EnhancedMultiStepForm';

export default function EnhancedMovingForm() {
  return <EnhancedMultiStepForm formType="moving" />;
}

// Force server-side rendering to avoid static generation issues
export async function getServerSideProps() {
  return {
    props: {}
  };
}