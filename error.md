./src/app/(admin)/(ui-elements)/avatars/SnippetActions.tsx
408:9  Warning: The 'checkForChanges' function makes the dependencies of useEffect Hook (at line 498) change on every render. Move it inside the 
useEffect callback. Alternatively, wrap the definition of 'checkForChanges' in its own useCallback() Hook.  react-hooks/exhaustive-deps

./src/app/(admin)/(ui-elements)/crm-leads/page.tsx
442:4  Warning: React Hook React.useEffect has missing dependencies: 'interestOptions', 'leadTypeOptions', and 'sourceOptions'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
546:4  Warning: React Hook React.useEffect has a missing dependency: 'lead'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
554:4  Warning: React Hook React.useEffect has a missing dependency: 'fetchEmployees'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
3321:4  Warning: React Hook useEffect has a missing dependency: 'getLeadScore'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps

./src/app/(admin)/(ui-elements)/crm-settings/customize/page.tsx
122:11  Warning: The 'showAlert' function makes the dependencies of useCallback Hook (at line 247) change on every render. To fix this, wrap the 
definition of 'showAlert' in its own useCallback() Hook.  react-hooks/exhaustive-deps

./src/app/(admin)/(ui-elements)/dashboard/page.tsx
331:9  Warning: The 'pendingCustomRange' array makes the dependencies of useMemo Hook (at line 369) change on every render. To fix this, wrap the initialization of 'pendingCustomRange' in its own useMemo() Hook.  react-hooks/exhaustive-deps
331:9  Warning: The 'pendingCustomRange' array makes the dependencies of useMemo Hook (at line 379) change on every render. To fix this, wrap the initialization of 'pendingCustomRange' in its own useMemo() Hook.  react-hooks/exhaustive-deps

./src/app/(admin)/(ui-elements)/documentation/page.tsx
56:9  Warning: Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any').

./src/app/(admin)/(ui-elements)/helpdesk-create-ticket/page.tsx
28:5  Warning: Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any').
41:11  Error: 'Order' is defined but never used.  @typescript-eslint/no-unused-vars
65:10  Error: 'billingHistoryOpen' is assigned a value but never used.  @typescript-eslint/no-unused-vars
65:30  Error: 'setBillingHistoryOpen' is assigned a value but never used.  @typescript-eslint/no-unused-vars
118:10  Error: 'billingHistoryError' is assigned a value but never used.  @typescript-eslint/no-unused-vars
122:10  Error: 'paypalPaymentsLoading' is assigned a value but never used.  @typescript-eslint/no-unused-vars
123:10  Error: 'paypalPaymentsError' is assigned a value but never used.  @typescript-eslint/no-unused-vars
329:9  Warning: Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any').
334:17  Warning: Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any').
352:7  Warning: Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any').
356:7  Warning: Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-explicit-any').
1287:27  Error: 'setRazorpayLoading' is assigned a value but never used.  @typescript-eslint/no-unused-vars
1288:25  Error: 'setRazorpayError' is assigned a value but never used.  @typescript-eslint/no-unused-vars

./src/app/(admin)/(ui-elements)/integration-center-connectors/page.tsx
351:25  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/app/(admin)/(ui-elements)/llm-model/page.tsx
473:21  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

./src/app/(admin)/(ui-elements)/Profile/page.tsx
102:3  Warning: Unused eslint-disable directive (no problems were reported from 'react-hooks/exhaustive-deps').
172:6  Warning: React Hook useEffect has missing dependencies: 'getToken' and 'user'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps

./src/components/auth/OptimizedSignInForm.tsx
484:17  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element

info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules
PS C:\Users\Admin\Desktop\customer\dev-trainee\vishal_dev\mobiloitte-aiagent-nextjs-dev\mobiloitte-aiagent-nextjs-dev>