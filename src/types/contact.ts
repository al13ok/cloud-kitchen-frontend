export interface Contact {
  _id?: string;
  first_name: string;
  last_name: string;
  type?: string;
  company?: string;
  job_title?: string;
  emails: string[];
  phones: string[];
  address?: string;
  significant_date?: string;
  website?: string;
  related_person?: string;
  notes?: string;
}

export interface ContactFormData {
  first_name: string;
  last_name: string;
  type?: string;
  company: string;
  job_title: string;
  emails: string[];
  phones: string[];
  address: string;
  significant_date: string;
  website: string;
  related_person: string;
  notes: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface ApiError {
  detail: ValidationError[];
}
