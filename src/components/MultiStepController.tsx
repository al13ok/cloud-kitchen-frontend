"use client";

import React, { useState, useCallback, useMemo } from "react";
import { ProgressBar } from "./survey/ProgressBar";

interface RenderProps {
  attemptedNext: boolean;
  getCharCounterProps: (
    fieldId: string,
    value: string,
    options: { max: number; min?: number }
  ) => {
    counterId: string;
    counterText: string;
    ariaDescribedBy: string;
    isInvalid: boolean;
    exceeds: boolean;
    below: boolean;
  };
}

interface Step {
  id: string;
  title: string;
  description: string;
  render: (props: RenderProps) => React.ReactNode;
  validate: () => { valid: boolean; errors: string[] };
  isComplete: () => boolean;
}

interface MultiStepControllerProps {
  steps: Step[];
  onSubmit: () => void | Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
  autoAdvance?: boolean;
}

const MultiStepController: React.FC<MultiStepControllerProps> = ({
  steps,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Submit",
  autoAdvance = false,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const currentStepData = steps[currentStep];

  // Character counter helper
  const getCharCounterProps = useCallback(
    (
      fieldId: string,
      value: string,
      options: { max: number; min?: number }
    ) => {
      const length = value?.length || 0;
      const { max, min = 0 } = options;
      const exceeds = length > max;
      const below = length < min && length > 0;
      const isInvalid = exceeds || below;

      return {
        counterId: `${fieldId}-counter`,
        counterText: `${length}/${max}`,
        ariaDescribedBy: `${fieldId}-counter`,
        isInvalid,
        exceeds,
        below,
      };
    },
    []
  );

  const handleNext = useCallback(() => {
    if (!currentStepData) return;

    setAttemptedNext(true);
    const validation = currentStepData.validate();

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    setAttemptedNext(false);

    if (isLastStep) {
      // On last step, trigger submit
      onSubmit();
    } else {
      // Move to next step
      setCurrentStep(currentStep + 1);
      
      // Auto-advance if enabled
      if (autoAdvance && currentStep < steps.length - 1) {
        // Check if next step is complete, then auto-advance
        const nextStep = steps[currentStep + 1];
        if (nextStep && nextStep.isComplete()) {
          setTimeout(() => {
            setCurrentStep(currentStep + 2);
          }, 300);
        }
      }
    }
  }, [currentStep, currentStepData, isLastStep, onSubmit, autoAdvance, steps]);

  const handlePrevious = useCallback(() => {
    if (!isFirstStep) {
      setAttemptedNext(false);
      setErrors([]);
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep, isFirstStep]);

  const handleSubmit = useCallback(() => {
    if (!currentStepData) return;

    setAttemptedNext(true);
    const validation = currentStepData.validate();

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    onSubmit();
  }, [currentStepData, onSubmit]);

  const renderProps = useMemo<RenderProps>(
    () => ({
      attemptedNext,
      getCharCounterProps,
    }),
    [attemptedNext, getCharCounterProps]
  );

  if (!currentStepData) {
    return null;
  }

  return (
    <div className="flex flex-col space-y-6">
      {/* Progress Bar */}
      <ProgressBar currentStep={currentStep} totalSteps={steps.length} />

      {/* Step Title and Description */}
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {currentStepData.title}
        </h2>
        {currentStepData.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {currentStepData.description}
          </p>
        )}
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200"
          role="alert"
        >
          <ul className="list-disc space-y-1 pl-5">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Step Content */}
      <div className="min-h-[300px]">{currentStepData.render(renderProps)}</div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={handlePrevious}
          disabled={isFirstStep || isSubmitting}
          className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
            isFirstStep || isSubmitting
              ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
          }`}
          aria-label="Go to previous step"
        >
          Previous
        </button>

        {isLastStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-8 py-3 rounded-xl font-medium text-sm text-white transition-all duration-200 ${
              isSubmitting
                ? "bg-indigo-400 dark:bg-indigo-600 cursor-not-allowed"
                : "bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            }`}
            aria-label={submitLabel}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Submitting...
              </span>
            ) : (
              submitLabel
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            className="px-8 py-3 rounded-xl font-medium text-sm text-white bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400 dark:disabled:bg-indigo-600 disabled:cursor-not-allowed"
            aria-label="Go to next step"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default MultiStepController;
