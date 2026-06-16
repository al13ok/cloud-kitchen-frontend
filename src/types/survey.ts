export interface SurveyQuestion {
  text: string;
  type: 'text' | 'mcq';
  options?: string[];
}

export interface CreateSurveyRequest {
  title: string;
  description?: string;
  // Backend only accepts title and description
  // questions: SurveyQuestion[];
  // survey_type?: 'nps' | 'csat' | 'ces' | 'custom';
  // nps_score?: number;
  // csat_score?: number;
  // ces_score?: number;
}

export interface CreateSurveyResponse {
  survey_id: string;
  public_link: string;
  message: string;
}

export interface Survey {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'draft';
  responses: number;
  created_date: string;
  public_link?: string;
}

export interface SendSurveyEmailRequest {
  survey_id: string;
  recipient_email: string;
  // Backend only accepts survey_id and recipient_email
  // subject?: string;
  // message?: string;
}

export interface SendSurveyEmailResponse {
  message: string;
  recipient_email: string;
  survey_link: string;
}

export interface SurveyDetails {
  id: string;
  title: string;
  description?: string;
  type: 'nps' | 'csat' | 'ces' | 'custom';
  questions: SurveyQuestion[];
  nps_score?: number;
  csat_score?: number;
  ces_score?: number;
  status: 'active' | 'completed' | 'draft';
  created_date: string;
  public_link?: string;
}

// Department-related types
export interface DepartmentMember {
  name: string;
  email: string;
}

export interface Department {
  name: string;
  members: DepartmentMember[];
}

export interface SendSurveyEmailToDepartmentRequest {
  survey_id: string;
  department_name: string;
  subject?: string;
  message?: string;
}

export interface SendSurveyEmailToDepartmentResponse {
  success: boolean;
  message: string;
  department_name: string;
  emails_sent: number;
  failed_emails?: string[];
}

// Employee-related types
export interface Employee {
  id: string;
  name: string;
  email: string;
  department?: string;
  position?: string;
  created_at?: string;
}

export interface EmployeesResponse {
  items: Employee[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Customer-related types
export interface Customer {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  created_at?: string;
}

export interface CustomersResponse {
  items: Customer[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Survey feedback response type
export interface SurveyFeedbackResponse {
  message: string;
  feedback_id: string;
  submitted_date: string;
}