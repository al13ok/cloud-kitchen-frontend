import axios from 'axios';
import { Contact, ContactFormData } from '../types/contact';
import { generateContactFilename, generateTimestampedFilename } from '../utils/timestampUtils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export const contactService = {
  // Get all contacts
  async getContacts(): Promise<Contact[]> {
    try {
      const response = await api.get('/contacts/');
      return response.data;
    } catch (error) {
      console.error('Error fetching contacts:', error);
      throw error;
    }
  },

  // Removed copy endpoint usage; use getContact to fetch details for copy/paste flow

  // Download a single contact as vCard (.vcf)
  async downloadVCard(id: string, contactName?: string): Promise<{ blob: Blob; filename?: string }> {
    try {
      const response = await api.get(`/contacts/${id}/vcard`, { responseType: 'blob' });
      const disposition = (response.headers as Record<string, string | undefined>)['content-disposition'];
      let filename: string | undefined;
      if (disposition) {
        const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition);
        filename = decodeURIComponent(match?.[1] || match?.[2] || '');
      }
      
      // If no filename from server or we have contact name, generate timestamped filename
      if (!filename || contactName) {
        const baseName = contactName ? contactName.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_') : 'contact';
        filename = generateContactFilename(baseName, 'vcf');
      }
      
      return { blob: response.data as Blob, filename };
    } catch (error) {
      console.error('Error downloading contact vCard:', error);
      throw error;
    }
  },

  // Share multiple contacts as a combined vCard (.vcf)
  async shareContacts(ids: string[]): Promise<{ blob: Blob; filename?: string }> {
    try {
      const response = await api.post('/contacts/share', { ids }, { responseType: 'blob' });
      const disposition = (response.headers as Record<string, string | undefined>)['content-disposition'];
      let filename: string | undefined;
      if (disposition) {
        const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition);
        filename = decodeURIComponent(match?.[1] || match?.[2] || '');
      }
      return { blob: response.data as Blob, filename };
    } catch (error) {
      console.error('Error sharing contacts vCard:', error);
      throw error;
    }
  },

  // Get single contact by ID
  async getContact(id: string): Promise<Contact> {
    try {
      const response = await api.get(`/contacts/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching contact:', error);
      throw error;
    }
  },

  // Create new contact
  async createContact(contactData: ContactFormData): Promise<Contact> {
    try {
      console.log('Sending contact data to API:', contactData);
      const response = await api.post('/contacts/', contactData);
      console.log('API response:', response.data);
      return response.data;
    } catch (error) {
      const err = error as { response?: { data?: unknown; status?: number } };
      console.error('Error creating contact:', err);
      console.error('API Error Response:', err.response?.data);
      console.error('API Error Status:', err.response?.status);
      throw err;
    }
  },

  // Update existing contact
  async updateContact(id: string, contactData: ContactFormData): Promise<Contact> {
    try {
      const response = await api.put(`/contacts/${id}`, contactData);
      return response.data;
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  },

  // Delete contact
  async deleteContact(id: string): Promise<void> {
    try {
      await api.delete(`/contacts/${id}`);
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  },

  // Check for duplicate contacts
  async checkDuplicates(email?: string, phone?: string): Promise<Contact[]> {
    try {
      const allContacts = await this.getContacts();
      const duplicates: Contact[] = [];

      allContacts.forEach(contact => {
        // Check email duplicates
        if (email && contact.emails?.some(contactEmail => 
          contactEmail.toLowerCase() === email.toLowerCase()
        )) {
          duplicates.push(contact);
        }
        // Check phone duplicates
        else if (phone && contact.phones?.some(contactPhone => 
          contactPhone.replace(/[\s\-\(\)]/g, '') === phone.replace(/[\s\-\(\)]/g, '')
        )) {
          duplicates.push(contact);
        }
      });

      return duplicates;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return [];
    }
  },

  // Upload contacts in bulk via CSV
  async uploadBulk(file: File): Promise<{ processed_rows?: number; inserted_count?: number; skipped_rows?: number } & Record<string, unknown>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/contacts/upload-bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading contacts CSV:', error);
      throw error;
    }
  },

  // Download CSV template for bulk upload
  async downloadTemplate(): Promise<{ blob: Blob; filename?: string }> {
    try {
      const response = await api.get('/contacts/download-template', { responseType: 'blob' });
      const disposition = (response.headers as Record<string, string | undefined>)['content-disposition'];
      let filename: string | undefined;
      if (disposition) {
        const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition);
        filename = decodeURIComponent(match?.[1] || match?.[2] || '');
      }
      
      // Generate timestamped filename if none provided by server
      if (!filename) {
        filename = generateTimestampedFilename('contacts_template', 'csv');
      }
      
      return { blob: response.data as Blob, filename };
    } catch (error) {
      console.error('Error downloading CSV template:', error);
      throw error;
    }
  },

  // Download selected contacts as CSV
  async downloadSelected(ids: string[]): Promise<{ blob: Blob; filename?: string }> {
    try {
      const response = await api.get('/contacts/download', {
        params: { ids: ids.join(',') },
        responseType: 'blob',
      });
      const disposition = (response.headers as Record<string, string | undefined>)['content-disposition'];
      let filename: string | undefined;
      if (disposition) {
        const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition);
        filename = decodeURIComponent(match?.[1] || match?.[2] || '');
      }
      
      // Generate timestamped filename if none provided by server
      if (!filename) {
        filename = generateTimestampedFilename(`contacts_${ids.length}`, 'csv');
      }
      
      return { blob: response.data as Blob, filename };
    } catch (error) {
      console.error('Error downloading selected contacts CSV:', error);
      throw error;
    }
  },
};
