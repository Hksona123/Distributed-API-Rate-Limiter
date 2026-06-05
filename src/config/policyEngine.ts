import fs from 'fs';
import path from 'path';

export interface Policy {
  route: string;
  methods: string[];
  windowMs: number;
  limit: number;
}

export interface Config {
  policies: Policy[];
  default: {
    windowMs: number;
    limit: number;
  };
}

let config: Config;

try {
  const fileContent = fs.readFileSync(path.join(__dirname, '../../policies.json'), 'utf8');
  config = JSON.parse(fileContent);
} catch (error) {
  console.warn('Could not read policies.json, using fallback defaults.');
  config = {
    policies: [],
    default: { windowMs: 1000, limit: 10 }
  };
}

export const getPolicyForRequest = (route: string, method: string): { windowMs: number, limit: number } => {
  // Find a specific policy matching the route and method
  const matchedPolicy = config.policies.find(p => 
    route.startsWith(p.route) && p.methods.includes(method)
  );

  if (matchedPolicy) {
    return { windowMs: matchedPolicy.windowMs, limit: matchedPolicy.limit };
  }

  // Fallback to default
  return config.default;
};
