'use client';

import { useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jspdf: any;
  }
}

function InvoiceGeneratorContent({ searchParams }: { searchParams: URLSearchParams }) {
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const itemsContainerRef = useRef<HTMLDivElement>(null);
  const downloadBtnRef = useRef<HTMLButtonElement>(null);

  // Function to convert number to words
  const convertToWords = useCallback((num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    }
    if (num < 1000) {
      return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' and ' + convertToWords(num % 100) : '');
    }
    if (num < 100000) {
      return convertToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + convertToWords(num % 1000) : '');
    }
    if (num < 10000000) {
      return convertToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + convertToWords(num % 100000) : '');
    }
    return convertToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 !== 0 ? ' ' + convertToWords(num % 10000000) : '');
  }, []);

  // Function to create item row
  const createItemRow = () => {
    const div = document.createElement('div');
    div.className = 'flex space-x-2 mb-2';
    div.innerHTML = `
      <input type="text" placeholder="Plan Name" class="item-plan_name border p-1 rounded" required />
      <input type="text" placeholder="Description" class="item-description border p-1 rounded" required />
      <input type="number" placeholder="Price" class="item-price border p-1 rounded" required step="0.01" />
      <input type="text" placeholder="Billing Cycle" class="item-billing_cycle border p-1 rounded" required />
      <input type="text" placeholder="Currency" class="item-currency border p-1 rounded" required />
      <input type="text" placeholder="Features" class="item-features border p-1 rounded" required />
    `;
    return div;
  };

  // Function to load billing data
  const loadBillingData = async () => {
    try {
      const response = await fetch((process.env.NEXT_PUBLIC_API_URL) + "/billing/bu-payment-details", {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Populate form fields with server data
        if (data.business_id) (document.getElementById('business_id') as HTMLInputElement).value = data.business_id;
        if (data.name) (document.getElementById('name') as HTMLInputElement).value = data.name;
        if (data.email) (document.getElementById('email') as HTMLInputElement).value = data.email;
        if (data.company_name) (document.getElementById('company_name') as HTMLInputElement).value = data.company_name;
        if (data.address) (document.getElementById('address') as HTMLInputElement).value = data.address;
        if (data.street_number) (document.getElementById('street_number') as HTMLInputElement).value = data.street_number;
        if (data.city) (document.getElementById('city') as HTMLInputElement).value = data.city;
        if (data.state) (document.getElementById('state') as HTMLInputElement).value = data.state;
        if (data.country) (document.getElementById('country') as HTMLInputElement).value = data.country;
        if (data.zip_code) (document.getElementById('zip_code') as HTMLInputElement).value = data.zip_code;
        if (data.additional_info) (document.getElementById('additional_info') as HTMLTextAreaElement).value = data.additional_info;
        if (data.currency) (document.getElementById('currency') as HTMLInputElement).value = data.currency;
        if (data.created_at) (document.getElementById('created_at') as HTMLInputElement).value = data.created_at;
        
        // Update display elements
        if (data.business_id) (document.getElementById('business_id_display') as HTMLElement).textContent = data.business_id;
        if (data.name) (document.getElementById('name_display') as HTMLElement).textContent = data.name;
        if (data.email) (document.getElementById('email_display') as HTMLElement).textContent = data.email;
        if (data.company_name) (document.getElementById('company_name_display') as HTMLElement).textContent = data.company_name;
        if (data.address) (document.getElementById('address_display') as HTMLElement).textContent = data.address;
        if (data.address) (document.getElementById('customer_address_display') as HTMLElement).textContent = data.address;
        if (data.city && data.state && data.zip_code) {
          const cityStateZip = data.city + ", " + data.state + ", " + data.zip_code;
          (document.getElementById('city_state_zip_display') as HTMLElement).textContent = cityStateZip;
          (document.getElementById('customer_city_state_zip_display') as HTMLElement).textContent = cityStateZip;
        }
        if (data.country) {
          (document.getElementById('country_display') as HTMLElement).textContent = data.country;
          (document.getElementById('customer_country_display') as HTMLElement).textContent = data.country;
        }
        if (data.vat_number) (document.getElementById('vat_number_display') as HTMLElement).textContent = data.vat_number;
        if (data.currency) (document.getElementById('currency_display') as HTMLElement).textContent = data.currency;
        if (data.created_at) (document.getElementById('created_at_display') as HTMLElement).textContent = data.created_at;
        
        console.log('Form populated with server data');
      }
    } catch (error) {
      console.log('Could not load existing billing data:', error);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Gather all form data
      const itemRows = itemsContainerRef.current?.querySelectorAll('div');
      const items = Array.from(itemRows || []).map(row => {
        const plan_name = (row.querySelector('.item-plan_name') as HTMLInputElement).value;
        const description = (row.querySelector('.item-description') as HTMLInputElement).value;
        const price = (row.querySelector('.item-price') as HTMLInputElement).value;
        const billing_cycle = (row.querySelector('.item-billing_cycle') as HTMLInputElement).value;
        const currency = (row.querySelector('.item-currency') as HTMLInputElement).value;
        const features = (row.querySelector('.item-features') as HTMLInputElement).value;
        return { plan_name, description, price, billing_cycle, currency, features };
      });

      // Get all other fields
      const details = {
        business_id: (document.getElementById('business_id') as HTMLInputElement).value,
        name: (document.getElementById('name') as HTMLInputElement).value,
        email: (document.getElementById('email') as HTMLInputElement).value,
        company_name: (document.getElementById('company_name') as HTMLInputElement).value,
        vat_number: (document.getElementById('vat_number') as HTMLInputElement).value,
        country: (document.getElementById('country') as HTMLInputElement).value,
        address: (document.getElementById('address') as HTMLInputElement).value,
        street_number: (document.getElementById('street_number') as HTMLInputElement).value,
        city: (document.getElementById('city') as HTMLInputElement).value,
        state: (document.getElementById('state') as HTMLInputElement).value,
        zip_code: (document.getElementById('zip_code') as HTMLInputElement).value,
        additional_info: (document.getElementById('additional_info') as HTMLTextAreaElement).value,
        currency: (document.getElementById('currency') as HTMLInputElement).value,
        created_at: (document.getElementById('created_at') as HTMLInputElement).value,
      };

      // Create PDF using jsPDF
      const doc = new jsPDF();

      // Header
      doc.setFontSize(16);
      doc.text('INVOICE', 105, 15, { align: 'center' });
      doc.setFontSize(10);

      // Seller/Company Info (left)
      const y = 25;
      doc.text('Sold By :', 10, y);
      doc.text(details.company_name || 'Company Name', 10, y + 6);
      doc.text(details.address || 'Address', 10, y + 12);
      doc.text((details.city || 'City') + ', ' + (details.state || 'State') + ', ' + (details.zip_code || 'ZIP'), 10, y + 18);
      doc.text(details.country || 'Country', 10, y + 24);
      doc.text('GST/VAT No: ' + (details.vat_number || 'N/A'), 10, y + 30);

      // Buyer Info (right)
      doc.text('Billing Address :', 120, y);
      doc.text(details.name || 'Customer Name', 120, y + 6);
      doc.text(details.address || 'Address', 120, y + 12);
      doc.text((details.city || 'City') + ', ' + (details.state || 'State') + ', ' + (details.zip_code || 'ZIP'), 120, y + 18);
      doc.text(details.country || 'Country', 120, y + 24);
      doc.text('Email: ' + (details.email || 'email@example.com'), 120, y + 30);

      // Invoice meta
      const metaY = y + 40;
      doc.text('Business ID: ' + (details.business_id || 'N/A'), 10, metaY);
      doc.text('Created At: ' + (details.created_at || new Date().toLocaleDateString()), 10, metaY + 6);
      doc.text('Currency: ' + (details.currency || 'USD'), 10, metaY + 12);
      doc.text('Additional Info: ' + (details.additional_info || 'N/A'), 10, metaY + 18);

      // Table for items
      if (items.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (doc as any).autoTable({
          head: [[
            'Sl. No', 'Plan Name', 'Description', 'Price', 'Billing Cycle', 'Currency', 'Features'
          ]],
          body: items.map((item, idx) => [
            (idx + 1).toString(),
            item.plan_name || 'N/A',
            item.description || 'N/A',
            item.price || '0',
            item.billing_cycle || 'N/A',
            item.currency || 'USD',
            item.features || 'N/A'
          ]),
          startY: metaY + 28,
          theme: 'grid',
          headStyles: { fillColor: [200, 200, 200] },
          styles: { fontSize: 9, cellPadding: 2 }
        });
      }

      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.price || '0'), 0);

      // Amount in Words
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : metaY + 50;
      doc.setFontSize(10);
      doc.text('Total Amount: $' + totalAmount.toFixed(2), 10, finalY);
      doc.text('Amount in Words:', 10, finalY + 10);
      doc.text(convertToWords(totalAmount), 50, finalY + 10);

      // Signature
      doc.text('For ' + (details.company_name || 'Company') + ':', 10, finalY + 30);
      doc.text('Authorized Signatory', 150, finalY + 30);

      // Save PDF
      doc.save('invoice.pdf');

      // Show success message
      if (resultRef.current) {
        resultRef.current.innerHTML = `
          <div class="border rounded p-4 bg-green-50 shadow">
            <h3 class="text-green-800 font-semibold">✅ Invoice Generated Successfully!</h3>
            <p class="text-green-600">PDF has been downloaded as 'invoice.pdf'</p>
          </div>
        `;
      }

    } catch (error) {
      console.error('Error generating PDF:', error);
      if (resultRef.current) {
        resultRef.current.innerHTML = `
          <div class="border rounded p-4 bg-red-50 shadow">
            <h3 class="text-red-800 font-semibold">❌ Error Generating PDF</h3>
            <p class="text-red-600">${error instanceof Error ? error.message : 'Unknown error occurred'}</p>
          </div>
        `;
      }
    }
  };

  // Handle add item button
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAddItem = () => {
    if (itemsContainerRef.current) {
      itemsContainerRef.current.appendChild(createItemRow());
    }
  };

  // Handle store order button
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleStoreOrder = async () => {
    // Gather items
    const itemRows = itemsContainerRef.current?.querySelectorAll('div');
    const items = Array.from(itemRows || []).map(row => {
      const plan_name = (row.querySelector('.item-plan_name') as HTMLInputElement).value;
      const description = (row.querySelector('.item-description') as HTMLInputElement).value;
      const price = parseFloat((row.querySelector('.item-price') as HTMLInputElement).value);
      const billing_cycle = (row.querySelector('.item-billing_cycle') as HTMLInputElement).value;
      const currency = (row.querySelector('.item-currency') as HTMLInputElement).value;
      const features = (row.querySelector('.item-features') as HTMLInputElement).value;
      return { plan_name, description, price, billing_cycle, currency, features };
    });

    const payload = {
      company_name: (document.getElementById('company_name') as HTMLInputElement).value,
      business_id: (document.getElementById('business_id') as HTMLInputElement).value,
      name: (document.getElementById('name') as HTMLInputElement).value,
      email: (document.getElementById('email') as HTMLInputElement).value,
      address: (document.getElementById('address') as HTMLInputElement).value,
      street_number: (document.getElementById('street_number') as HTMLInputElement).value,
      city: (document.getElementById('city') as HTMLInputElement).value,
      state: (document.getElementById('state') as HTMLInputElement).value,
      country: (document.getElementById('country') as HTMLInputElement).value,
      zip_code: (document.getElementById('zip_code') as HTMLInputElement).value,
      vat_number: (document.getElementById('vat_number') as HTMLInputElement).value,
      additional_info: (document.getElementById('additional_info') as HTMLTextAreaElement).value,
      currency: (document.getElementById('currency') as HTMLInputElement).value,
      created_at: (document.getElementById('created_at') as HTMLInputElement).value,
      invoice_number: (document.getElementById('invoice_number') as HTMLInputElement)?.value,
      invoice_date: (document.getElementById('invoice_date') as HTMLInputElement)?.value,
      items
    };

    try {
      // Call backend to store order
      const response = await fetch((process.env.NEXT_PUBLIC_API_URL) + "/billing/store-order", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const responseData = await response.json();
        // Fill Invoice Info fields from API response
        (document.getElementById('id') as HTMLInputElement).value = responseData.id || '';
        (document.getElementById('order_id') as HTMLInputElement).value = responseData.order_id || '';
        (document.getElementById('status') as HTMLInputElement).value = responseData.status || '';
        (document.getElementById('amount') as HTMLInputElement).value = responseData.amount || '';
        (document.getElementById('date') as HTMLInputElement).value = responseData.date || '';
        if (resultRef.current) {
          resultRef.current.innerHTML = `
            <div class="border rounded p-4 bg-green-50 shadow">
              <h3 class="text-green-800 font-semibold">✅ Order Stored Successfully!</h3>
              <p class="text-green-600">Order ID: ${responseData.order_id}</p>
              <p class="text-green-600">Status: ${responseData.status}</p>
            </div>
          `;
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(error);
      if (resultRef.current) {
        resultRef.current.innerHTML = `
          <div class="border rounded p-4 bg-red-50 shadow">
            <h3 class="text-red-800 font-semibold">❌ Failed to store order</h3>
            <p class="text-red-600">${error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        `;
      }
    }
  };

  // Handle fetch orders button
  const handleFetchOrders = async () => {
    try {
      const response = await fetch((process.env.NEXT_PUBLIC_API_URL) + "/billing/orders", {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const orders = await response.json();
        if (!orders.length) {
          // No orders found - leave fields empty
          console.log('No orders found');
          return;
        }
        // Latest order (last in array)
        const order = orders[orders.length - 1];

        // Fill Invoice Info fields
        (document.getElementById('id') as HTMLInputElement).value = order._id || '';
        (document.getElementById('order_id') as HTMLInputElement).value = order.order_id || '';
        (document.getElementById('status') as HTMLInputElement).value = order.status || '';
        (document.getElementById('amount') as HTMLInputElement).value = order.amount || '';
        (document.getElementById('date') as HTMLInputElement).value = order.date || '';
        
        // Update display elements
        (document.getElementById('order_id_display') as HTMLElement).textContent = order.order_id || 'N/A';
        (document.getElementById('status_display') as HTMLElement).textContent = order.status || 'N/A';
        
        console.log('Latest order data loaded successfully');
      } else {
        console.log('API Error: ' + response.statusText);
      }
    } catch (error) {
      console.log('Network or JS Error: ' + (error instanceof Error ? error.message : error));
    }
  };

  // Handle fetch plans button
  const handleFetchPlans = useCallback(async () => {
    try {
      // Show loading state for desktop
      if (itemsContainerRef.current) {
        itemsContainerRef.current.innerHTML = `
          <div class="flex items-center justify-center py-4">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span class="ml-2 text-gray-600">Loading plans...</span>
          </div>
        `;
      }

      // Show loading state for mobile
      const mobileContainer = document.getElementById('mobile_items_container');
      if (mobileContainer) {
        mobileContainer.innerHTML = `
          <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div class="flex items-center justify-center py-4">
              <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span class="ml-2 text-gray-600 text-sm">Loading plans...</span>
            </div>
          </div>
        `;
      }

      const response = await fetch((process.env.NEXT_PUBLIC_API_URL) + "/billing/sub-plan", {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const plans = await response.json();
        // Clear existing items
        if (itemsContainerRef.current) {
          itemsContainerRef.current.innerHTML = '';
        }
        
        if (plans.length === 0) {
          // Add one default item row if no plans found for desktop
          if (itemsContainerRef.current) {
            itemsContainerRef.current.appendChild(createItemRow());
          }
          
          // Show no plans message for mobile
          const mobileContainer = document.getElementById('mobile_items_container');
          if (mobileContainer) {
            mobileContainer.innerHTML = `
              <div class="text-center py-4 text-gray-500 text-sm">
                No plans found. Please add items manually.
              </div>
            `;
          }
          return;
        }
        
        // Create item row for each plan
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        plans.forEach((plan: any) => {
          const div = document.createElement('div');
          div.className = 'flex space-x-2 mb-2';
          div.innerHTML = `
            <input type="text" placeholder="Plan Name" class="item-plan_name border p-1 rounded" required value="${plan.plan_name || ''}" />
            <input type="text" placeholder="Description" class="item-description border p-1 rounded" required value="${plan.description || ''}" />
            <input type="number" placeholder="Price" class="item-price border p-1 rounded" required step="0.01" value="${plan.price || ''}" />
            <input type="text" placeholder="Billing Cycle" class="item-billing_cycle border p-1 rounded" required value="${plan.billing_cycle || ''}" />
            <input type="text" placeholder="Currency" class="item-currency border p-1 rounded" required value="${plan.currency || 'USD'}" />
            <input type="text" placeholder="Features" class="item-features border p-1 rounded" required value="${Array.isArray(plan.features) ? plan.features.join(', ') : ''}" />
          `;
          if (itemsContainerRef.current) {
            itemsContainerRef.current.appendChild(div);
          }
        });

        // Update table display for desktop
        const tableBody = document.getElementById('items_table_body');
        if (tableBody) {
          tableBody.innerHTML = '';
          let totalAmount = 0;
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          plans.forEach((plan: any, idx: number) => {
            const row = document.createElement('tr');
            const price = parseFloat(plan.price || '0');
            totalAmount += price;
            
            row.innerHTML = `
              <td class="border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-900">${idx + 1}</td>
              <td class="border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-900">${plan.plan_name || 'N/A'}</td>
              <td class="border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-900">${plan.description || 'N/A'}</td>
              <td class="border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-900">$${price.toFixed(2)}</td>
              <td class="border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-900">${plan.billing_cycle || 'N/A'}</td>
              <td class="border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-900">${plan.currency || 'USD'}</td>
              <td class="border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-gray-900">${Array.isArray(plan.features) ? plan.features.join(', ') : 'N/A'}</td>
            `;
            tableBody.appendChild(row);
          });
          
          // Update total amount display
          (document.getElementById('total_amount_display') as HTMLElement).textContent = `$${totalAmount.toFixed(2)}`;
          (document.getElementById('amount_in_words_display') as HTMLElement).textContent = convertToWords(totalAmount);
        }

        // Update mobile cards display
        const mobileContainer = document.getElementById('mobile_items_container');
        if (mobileContainer) {
          mobileContainer.innerHTML = '';
          let totalAmount = 0;
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          plans.forEach((plan: any, idx: number) => {
            const price = parseFloat(plan.price || '0');
            totalAmount += price;
            
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg p-4 border border-gray-200 shadow-sm';
            card.innerHTML = `
              <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                  <h4 class="font-semibold text-gray-900 text-sm sm:text-base">${idx + 1}. ${plan.plan_name || 'N/A'}</h4>
                  <p class="text-gray-600 text-xs sm:text-sm mt-1">${plan.description || 'N/A'}</p>
                </div>
                <div class="text-right ml-4">
                  <p class="font-bold text-blue-600 text-sm sm:text-base">$${price.toFixed(2)}</p>
                  <p class="text-gray-500 text-xs">${plan.currency || 'USD'}</p>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                <div>
                  <span class="text-gray-500">Billing Cycle:</span>
                  <span class="text-gray-900 ml-1">${plan.billing_cycle || 'N/A'}</span>
                </div>
                <div>
                  <span class="text-gray-500">Features:</span>
                  <span class="text-gray-900 ml-1 break-words">${Array.isArray(plan.features) ? plan.features.join(', ') : 'N/A'}</span>
                </div>
              </div>
            `;
            mobileContainer.appendChild(card);
          });
          
          // Update total amount display for mobile
          (document.getElementById('total_amount_display') as HTMLElement).textContent = `$${totalAmount.toFixed(2)}`;
          (document.getElementById('amount_in_words_display') as HTMLElement).textContent = convertToWords(totalAmount);
        }
      } else {
        // Show error message for desktop
        if (itemsContainerRef.current) {
          itemsContainerRef.current.innerHTML = `
            <div class="text-center py-4 text-red-500">
              Failed to load plans. Please try again or add items manually.
            </div>
          `;
        }

        // Show error message for mobile
        const mobileContainer = document.getElementById('mobile_items_container');
        if (mobileContainer) {
          mobileContainer.innerHTML = `
            <div class="text-center py-4 text-red-500 text-sm">
              Failed to load plans. Please try again or add items manually.
            </div>
          `;
        }
      }
    } catch {
      // Show error message for desktop
      if (itemsContainerRef.current) {
        itemsContainerRef.current.innerHTML = `
          <div class="text-center py-4 text-red-500">
            Network error. Please check your connection and try again.
          </div>
        `;
      }

      // Show error message for mobile
      const mobileContainer = document.getElementById('mobile_items_container');
      if (mobileContainer) {
        mobileContainer.innerHTML = `
          <div class="text-center py-4 text-red-500 text-sm">
            Network error. Please check your connection and try again.
          </div>
        `;
      }
    }
  }, [convertToWords]);

  // Handle download PDF button
  const handleDownloadPdf = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = (window as any).lastInvoicePayload;
    if (!payload) return;
    try {
      const pdfRes = await fetch((process.env.NEXT_PUBLIC_API_URL) + "/billing/bu-payment-details", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (pdfRes.ok) {
        const responseData = await pdfRes.json();
        alert(`Billing details saved successfully! ID: ${responseData.id}`);
      } else {
        throw new Error(`HTTP ${pdfRes.status}: ${pdfRes.statusText}`);
      }
    } catch (error) {
      alert(`Failed to save billing details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Auto-download function for View Invoice
  const autoDownloadInvoice = useCallback(async (orderId: string) => {
    try {
      // Fetch billing details
      const billingResponse = await fetch((process.env.NEXT_PUBLIC_API_URL) + "/billing/bu-payment-details", {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!billingResponse.ok) {
        throw new Error('Failed to fetch billing details');
      }
      
      const billingData = await billingResponse.json();
      
      // Fetch plans for items
      const plansResponse = await fetch((process.env.NEXT_PUBLIC_API_URL) + "/billing/sub-plan", {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!plansResponse.ok) {
        throw new Error('Failed to fetch plans');
      }
      
      const plans = await plansResponse.json();
      
      // Create PDF using jsPDF
      const doc = new jsPDF();

      // Header
      doc.setFontSize(16);
      doc.text('INVOICE', 105, 15, { align: 'center' });
      doc.setFontSize(10);

      // Seller/Company Info (left)
      const y = 25;
      doc.text('Sold By :', 10, y);
      doc.text(billingData.company_name || 'Company Name', 10, y + 6);
      doc.text(billingData.address || 'Address', 10, y + 12);
      doc.text((billingData.city || 'City') + ', ' + (billingData.state || 'State') + ', ' + (billingData.zip_code || 'ZIP'), 10, y + 18);
      doc.text(billingData.country || 'Country', 10, y + 24);
      doc.text('GST/VAT No: ' + (billingData.vat_number || 'N/A'), 10, y + 30);

      // Buyer Info (right)
      doc.text('Billing Address :', 120, y);
      doc.text(billingData.name || 'Customer Name', 120, y + 6);
      doc.text(billingData.address || 'Address', 120, y + 12);
      doc.text((billingData.city || 'City') + ', ' + (billingData.state || 'State') + ', ' + (billingData.zip_code || 'ZIP'), 120, y + 18);
      doc.text(billingData.country || 'Country', 120, y + 24);
      doc.text('Email: ' + (billingData.email || 'email@example.com'), 120, y + 30);

      // Invoice meta
      const metaY = y + 40;
      doc.text('Business ID: ' + (billingData.business_id || 'N/A'), 10, metaY);
      doc.text('Created At: ' + (new Date().toLocaleDateString()), 10, metaY + 6);
      doc.text('Currency: ' + (billingData.currency || 'USD'), 10, metaY + 12);
      doc.text('Additional Info: ' + (billingData.additional_info || 'N/A'), 10, metaY + 18);

      // Table for items
      if (plans.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (doc as any).autoTable({
          head: [[
            'Sl. No', 'Plan Name', 'Description', 'Price', 'Billing Cycle', 'Currency', 'Features'
          ]],
          body: // eslint-disable-next-line @typescript-eslint/no-explicit-any
          plans.map((plan: any, idx: number) => [
            (idx + 1).toString(),
            plan.plan_name || 'N/A',
            plan.description || 'N/A',
            plan.price || '0',
            plan.billing_cycle || 'N/A',
            plan.currency || 'USD',
            Array.isArray(plan.features) ? plan.features.join(', ') : 'N/A'
          ]),
          startY: metaY + 28,
          theme: 'grid',
          headStyles: { fillColor: [200, 200, 200] },
          styles: { fontSize: 9, cellPadding: 2 }
        });
      }

      // Calculate total amount
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalAmount = plans.reduce((sum: number, plan: any) => sum + parseFloat(plan.price || '0'), 0);

      // Amount in Words
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : metaY + 50;
      doc.setFontSize(10);
      doc.text('Total Amount: $' + totalAmount.toFixed(2), 10, finalY);
      doc.text('Amount in Words:', 10, finalY + 10);
      doc.text(convertToWords(totalAmount), 50, finalY + 10);

      // Signature
      doc.text('For ' + (billingData.company_name || 'Company') + ':', 10, finalY + 30);
      doc.text('Authorized Signatory', 150, finalY + 30);

      // Save PDF
      doc.save(`invoice-${orderId}.pdf`);
      
      console.log('Invoice PDF auto-downloaded successfully for order:', orderId);
      
      // Show success message
      if (resultRef.current) {
        resultRef.current.innerHTML = `
          <div class="border rounded p-4 bg-green-50 shadow">
            <h3 class="text-green-800 font-semibold">✅ Invoice Downloaded Successfully!</h3>
            <p class="text-green-600">PDF has been downloaded as 'invoice-${orderId}.pdf'</p>
          </div>
        `;
      }
      
    } catch (error) {
      console.error('Error auto-downloading PDF:', error);
      if (resultRef.current) {
        resultRef.current.innerHTML = `
          <div class="border rounded p-4 bg-red-50 shadow">
            <h3 class="text-red-800 font-semibold">❌ Error Downloading PDF</h3>
            <p class="text-red-600">${error instanceof Error ? error.message : 'Unknown error occurred'}</p>
          </div>
        `;
      }
    }
  }, [convertToWords]);

  useEffect(() => {
    // Set current date
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    (document.getElementById('created_at') as HTMLInputElement).value = currentDate;
    
    // Load billing data when page loads
    loadBillingData();
    
    // Automatically fetch plans when page loads
    handleFetchPlans();
    
    // Automatically fetch latest order when page loads
    handleFetchOrders();

    // Check for auto-download parameters (only for Download PDF, not View Invoice)
    const orderId = searchParams.get('orderId');
    const autoDownload = searchParams.get('autoDownload');
    const view = searchParams.get('view');
    
    if (orderId && autoDownload === 'true' && !view) {
      // Wait a bit for data to load, then auto-download
      setTimeout(() => {
        autoDownloadInvoice(orderId);
      }, 2000);
    }
  }, [searchParams, autoDownloadInvoice, handleFetchPlans]);

  return (
    <div className="bg-gray-50 min-h-screen p-2 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Invoice Header */}
        <div className="bg-white p-4 sm:p-6 md:p-8 relative">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-gray-800">INVOICE</h1>
            <p className="text-sm sm:text-base text-gray-600">Professional Invoice Generator</p>
          </div>
        </div>

        {/* Company and Customer Info */}
        <div className="p-4 sm:p-6 md:p-8 border-b border-gray-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* Company Info */}
            <div className="order-2 lg:order-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                </svg>
                Sold By
              </h3>
              <div className="space-y-1 sm:space-y-2">
                <p className="font-semibold text-gray-900 text-sm sm:text-base" id="company_name_display">Company Name</p>
                <p className="text-gray-600 text-sm sm:text-base" id="address_display">Address</p>
                <p className="text-gray-600 text-sm sm:text-base" id="city_state_zip_display">City, State, ZIP</p>
                <p className="text-gray-600 text-sm sm:text-base" id="country_display">Country</p>
                <p className="text-gray-600 text-sm sm:text-base">GST/VAT No: <span id="vat_number_display">N/A</span></p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="order-1 lg:order-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 flex items-center">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
                Billing Address
              </h3>
              <div className="space-y-1 sm:space-y-2">
                <p className="font-semibold text-gray-900 text-sm sm:text-base" id="name_display">Customer Name</p>
                <p className="text-gray-600 text-sm sm:text-base" id="customer_address_display">Address</p>
                <p className="text-gray-600 text-sm sm:text-base" id="customer_city_state_zip_display">City, State, ZIP</p>
                <p className="text-gray-600 text-sm sm:text-base" id="customer_country_display">Country</p>
                <p className="text-gray-600 text-sm sm:text-base">Email: <span id="email_display">email@example.com</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="p-4 sm:p-6 md:p-8 border-b border-gray-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Business ID</p>
              <p className="font-semibold text-gray-900 text-sm sm:text-base" id="business_id_display">N/A</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Order ID</p>
              <p className="font-semibold text-gray-900 text-sm sm:text-base" id="order_id_display">N/A</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Status</p>
              <p className="font-semibold text-gray-900 text-sm sm:text-base" id="status_display">N/A</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Currency</p>
              <p className="font-semibold text-gray-900 text-sm sm:text-base" id="currency_display">USD</p>
            </div>
          </div>
        </div>

        {/* Items Table - Mobile Responsive */}
        <div className="p-4 sm:p-6 md:p-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">Items</h3>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Sl. No</th>
                  <th className="border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Plan Name</th>
                  <th className="border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Description</th>
                  <th className="border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Price</th>
                  <th className="border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Billing Cycle</th>
                  <th className="border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Currency</th>
                  <th className="border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Features</th>
                </tr>
              </thead>
              <tbody id="items_table_body">
                <tr>
                  <td className="border border-gray-300 px-3 py-2 sm:px-4 sm:py-3 text-gray-500" colSpan={7}>
                    <div className="flex items-center justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-600 text-sm">Loading items...</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4" id="mobile_items_container">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 text-sm">Loading items...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total and Actions */}
        <div className="p-4 sm:p-6 md:p-8 bg-gray-50">
          <div className="text-center">
            <p className="text-base sm:text-lg font-semibold text-gray-800">Total Amount: <span className="text-blue-600" id="total_amount_display">$0.00</span></p>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">Amount in Words: <span id="amount_in_words_display" className="break-words">Zero</span></p>
            
            {/* Download Invoice Button */}
            <div className="mt-4 sm:mt-6">
              <button 
                onClick={handleSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 md:px-8 py-2 sm:py-3 rounded-lg font-semibold text-sm sm:text-base md:text-lg transition-colors duration-200 shadow-lg hover:shadow-xl flex items-center justify-center mx-auto w-full sm:w-auto"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Invoice
              </button>
            </div>
          </div>
        </div>

        {/* Hidden form for data collection */}
        <form ref={formRef} onSubmit={handleSubmit} className="hidden">
          <input type="text" id="business_id" placeholder="Business ID" required />
          <input type="text" id="name" placeholder="Name" required />
          <input type="email" id="email" placeholder="Email" required />
          <input type="text" id="company_name" placeholder="Company Name" required />
          <input type="text" id="vat_number" placeholder="VAT Number" />
          <input type="text" id="country" placeholder="Country" required />
          <input type="text" id="address" placeholder="Address" required />
          <input type="text" id="street_number" placeholder="Street Number" required />
          <input type="text" id="city" placeholder="City" required />
          <input type="text" id="state" placeholder="State" required />
          <input type="text" id="zip_code" placeholder="Zip Code" required />
          <textarea id="additional_info" placeholder="Additional Info"></textarea>
          <input type="text" id="currency" placeholder="Currency" defaultValue="USD" required />
          <input type="text" id="created_at" placeholder="Created At" readOnly />
          <input type="text" id="id" placeholder="ID" readOnly />
          <input type="text" id="order_id" placeholder="Order ID" readOnly />
          <input type="text" id="status" placeholder="Status" readOnly />
          <input type="number" id="amount" placeholder="Amount" readOnly />
          <input type="text" id="date" placeholder="Date" readOnly />
        </form>

        {/* Items container for data collection */}
        <div ref={itemsContainerRef} className="hidden"></div>
        
        <div ref={resultRef} className="p-4 sm:p-6 md:p-8"></div>
        
        <button 
          ref={downloadBtnRef}
          onClick={handleDownloadPdf} 
          className="hidden"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}

export default function InvoiceGenerator() {
  return (
    <Suspense fallback={<div className="bg-gray-50 min-h-screen p-2 sm:p-4 md:p-6 flex items-center justify-center"><div className="text-center">Loading...</div></div>}>
      <InvoiceGeneratorWrapper />
    </Suspense>
  );
}

function InvoiceGeneratorWrapper() {
  const searchParams = useSearchParams();
  return <InvoiceGeneratorContent searchParams={searchParams} />;
}
