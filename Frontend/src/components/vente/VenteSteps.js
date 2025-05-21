import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button
} from '@mui/material';
import VenteForm from './VenteForm';

const VenteSteps = ({ initialData, onSubmit, onCancel, isTransform = false }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState(initialData);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleFormChange = (newData) => {
    setFormData(prev => ({
      ...prev,
      ...newData
    }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <Box>
      <VenteForm
        formData={formData}
        onChange={handleFormChange}
        activeStep={activeStep}
        onNext={handleNext}
        onBack={handleBack}
        onSubmit={handleSubmit}
        isTransform={isTransform}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button onClick={onCancel}>
          Annuler
        </Button>
      </Box>
    </Box>
  );
};

export default VenteSteps; 