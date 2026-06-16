declare global {
    // eslint-disable-next-line no-var
    var passwordResetTokens: Map<string, {
      email: string;
      expiresAt: Date;
    }> | undefined;
  }
  
  export {};

declare module 'react-apexcharts' {
  import React from 'react';
  import type { ApexOptions } from 'apexcharts';
  type Props = {
    options: ApexOptions;
    series: unknown[];
    type?: string;
    width?: string | number;
    height?: string | number;
    [key: string]: unknown;
  };
  const ReactApexChart: React.FC<Props>;
  export default ReactApexChart;
} 