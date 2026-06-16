"use client";
import React from "react";

const helpFaqs: { question: string; answer: string }[] = [
  {
    question: 'How can I create a support ticket?',
    answer:
      'To create a ticket, go to the Helpdesk section and fill in your name, email, subject, and message. Once submitted, our team will review and respond shortly.',
  },
  {
    question: 'Where can I see my submitted tickets?',
    answer:
      'You can view all your submitted tickets in the "My Tickets" section. Click on the ticket ID to see details, replies, and status updates.',
  },
  {
    question: 'How do I reply to a support ticket?',
    answer:
      'Open your ticket from the "My Tickets" section. Scroll to the bottom of the ticket detail page and write your reply in the reply box.',
  },
  {
    question: 'How can I check the ticket status?',
    answer:
      'Each ticket shows its current status (Open, Pending, or Solved) in the ticket list and in the ticket details view.',
  },
  {
    question: 'Can I update the ticket after submission?',
    answer:
      "You can't change the original message, but you can add replies or comments to provide more information about the issue.",
  },
  {
    question: 'What does each ticket status mean?',
    answer:
      'Open: Ticket has been received.\nPending: Our team is reviewing it.\nSolved: The issue has been resolved.',
  },
];

interface FaqSectionProps {
  openFaq: number | null;
  setOpenFaq: (idx: number | null) => void;
}

const FaqSection: React.FC<FaqSectionProps> = ({ openFaq, setOpenFaq }) => (
  <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-4 sm:p-6 lg:p-8 mb-6">
    <h2 className="font-bold text-lg sm:text-xl lg:text-2xl text-blue-800 dark:text-blue-200 mb-4">FAQs</h2>
    <div className="divide-y divide-blue-100 dark:divide-blue-800">
      {helpFaqs.map((faq, idx) => (
        <div key={idx} className="py-3 sm:py-4">
          <button
            className="w-full flex items-center justify-between text-left font-semibold text-base sm:text-lg lg:text-xl text-gray-900 dark:text-white focus:outline-none"
            onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
          >
            {faq.question}
            <svg className={`w-4 h-4 ml-2 transform transition-transform duration-200 ${openFaq === idx ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openFaq === idx && (
            <div className="mt-2 text-gray-700 dark:text-gray-300 text-sm sm:text-base lg:text-lg">
              {faq.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

export default FaqSection;
