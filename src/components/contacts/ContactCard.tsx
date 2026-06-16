'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Contact } from '@/types/contact';
import { contactService } from '@/services/contactService';

interface ContactCardProps {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  initialExpanded?: boolean;
}

export default function ContactCard({ contact, onEdit, onDelete, isDeleting, initialExpanded }: ContactCardProps) {
  const [expanded, setExpanded] = useState(!!initialExpanded);
  const getInitials = (firstName: string, lastName?: string) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last;
  };

  const handleShareVCard = async () => {
    if (!contact._id) return;
    try {
      const contactName = `${contact.first_name} ${contact.last_name || ''}`.trim();
      const { blob, filename } = await contactService.downloadVCard(contact._id, contactName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'contact.vcf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // silent fail; in production could add toast
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="relative p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6 overflow-hidden">
      {/* Header with Avatar and Actions */}
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
        <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
          <div className="shrink-0 flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-blue-600 text-white font-semibold text-xl">
            {getInitials(contact.first_name, contact.last_name)}
          </div>
          <div className="order-3 xl:order-2">
            <h4 className="mb-2 text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
              <Link href={contact._id ? `/contacts/${contact._id}` : '#'} className="hover:underline">
                {contact.first_name} {contact.last_name}
              </Link>
            </h4>
            <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
              {contact.job_title && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {contact.job_title}
                </p>
              )}
              {contact.company && (
                <>
                  <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {contact.company}
                  </p>
                </>
              )}
              {contact.type && (
                <>
                  <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                  <p className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    {contact.type}
                  </p>
                </>
              )}
            </div>
          </div>
          {/* Absolute positioned action buttons to keep them inside the card */}
          <div className="absolute right-4 top-4 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={handleShareVCard}
              title="Share as vCard"
              className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </button>
            <button
              onClick={onEdit}
              className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
              title="Edit contact"
            >
              <svg
                className="fill-current"
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                  fill=""
                />
              </svg>
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 disabled:opacity-50"
              title="Delete contact"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="mt-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
          {/* Email */}
          {contact.emails && contact.emails.length > 0 && contact.emails[0] && (
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Email Address
              </p>
              <a
                href={`mailto:${contact.emails[0]}`}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {contact.emails[0]}
              </a>
              {contact.emails.length > 1 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  +{contact.emails.length - 1} more email{contact.emails.length > 2 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Phone */}
          {contact.phones && contact.phones.length > 0 && contact.phones[0] && (
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Phone Number
              </p>
              <a
                href={`tel:${contact.phones[0]}`}
                className="text-sm font-medium text-gray-800 dark:text-white/90"
              >
                {contact.phones[0]}
              </a>
              {contact.phones.length > 1 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  +{contact.phones.length - 1} more phone{contact.phones.length > 2 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Type */}
          {contact.type && (
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Type
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {contact.type}
              </p>
            </div>
          )}

          {/* Website */}
          {contact.website && (
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Website
              </p>
              <a
                href={contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {contact.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}

          {/* Additional fields hidden in compact mode */}
          {expanded && contact.significant_date && (
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Date of Birth
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {formatDate(contact.significant_date)}
              </p>
            </div>
          )}

          {/* Related Person */}
          {expanded && contact.related_person && (
            <div>
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Related Person
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {contact.related_person}
              </p>
            </div>
          )}

          {/* Address */}
          {expanded && contact.address && (
            <div className="col-span-2">
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Address
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {contact.address}
              </p>
            </div>
          )}

          {/* Notes */}
          {expanded && contact.notes && (
            <div className="col-span-2">
              <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                Notes
              </p>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                {contact.notes}
              </p>
            </div>
          )}
        </div>

        {/* Toggle */}
        {(contact.significant_date || contact.related_person || contact.address || contact.notes) && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setExpanded(prev => !prev)}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {expanded ? 'Hide details' : 'View details'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
