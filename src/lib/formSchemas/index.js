import { cleaningFormConfig } from './cleaningFormConfig';
import { movingFormConfig } from './movingFormConfig';

export const formConfigs = {
  cleaning: cleaningFormConfig,
  moving: movingFormConfig
};

export const getFormConfig = (formType) => {
  const config = formConfigs[formType];
  if (!config) {
    throw new Error(`Form configuration not found for type: ${formType}`);
  }
  return config;
};

export const getAllFormTypes = () => {
  return Object.keys(formConfigs);
};

export const getFormSteps = (formType) => {
  const config = getFormConfig(formType);
  return config.steps;
};

export const getFormStep = (formType, stepId) => {
  const steps = getFormSteps(formType);
  return steps.find(step => step.id === stepId);
};