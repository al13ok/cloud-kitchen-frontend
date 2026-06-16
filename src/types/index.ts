export type { Contact, ContactFormData, ApiResponse, ValidationError, ApiError } from './contact';

// Survey Types
export interface CreateSurveyRequest {
  title: string;
  description?: string;
  questions?: Array<{
    text: string;
    type: string;
    options?: string[];
  }>;
}

export interface CreateSurveyResponse {
  survey_id: string;
  public_link: string;
  message?: string;
}

export interface SendSurveyEmailRequest {
  survey_id: string;
  recipient_email: string;
  subject?: string;
  message?: string;
}

// Department Types
export interface Department {
  name: string;
  members: Array<{
    name: string;
    email: string;
  }>;
}