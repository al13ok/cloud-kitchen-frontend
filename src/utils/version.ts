export type VersionStatus = 'stable' | 'beta' | 'alpha';
export type AppEnvironment = 'production' | 'staging' | 'development';

export interface VersionInfo {
  version: string;
  status: VersionStatus;
  releaseDate: string; // ISO date string
  environment: AppEnvironment;
  buildNumber?: string;
  commitHash?: string;
  description?: string;
  features: string[];
}

export function getCurrentVersion(): VersionInfo {
  return {
    version: '1.0.0',
    status: 'stable',
    releaseDate: '2025-09-01',
    environment: 'production',
    buildNumber: '20250901.001',
    commitHash: 'abc123def456',
    description: 'Initial release',
    features: [
      'Core chatbot functionality',
      'User authentication',
      'Basic conversation flow',
      'Admin dashboard'
    ],
  };
}

export function getVersionHistory(): VersionInfo[] {
  // For now return only current version; extend as needed
  return [getCurrentVersion()];
}

export function getStatusDisplayText(status: VersionStatus | string): string {
  switch (status) {
    case 'stable':
      return 'Stable';
    case 'beta':
      return 'Beta';
    case 'alpha':
      return 'Alpha';
    default:
      return 'Unknown';
  }
}

export function getEnvironmentDisplayText(env: AppEnvironment | string): string {
  switch (env) {
    case 'production':
      return 'Production';
    case 'staging':
      return 'Staging';
    case 'development':
      return 'Development';
    default:
      return 'Unknown';
  }
}
