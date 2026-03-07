/**
 * Configures the MSW server for Node environments (testing).
 * This file is imported by test setup scripts.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
