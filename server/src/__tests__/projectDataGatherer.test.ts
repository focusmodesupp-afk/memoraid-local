import { describe, it, expect } from 'vitest';
import { gatherProjectData } from '../projectDataGatherer';

describe('projectDataGatherer', () => {
  it('returns a non-empty string for quick depth and all scope', async () => {
    const result = await gatherProjectData('quick', 'all');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(100);
    expect(result).toContain('package.json');
  });

  it('includes schema for all scope', async () => {
    const result = await gatherProjectData('quick', 'all');
    expect(result).toContain('shared/schemas/schema');
  });

  it('excludes schema for client-only scope', async () => {
    const result = await gatherProjectData('quick', 'client');
    expect(result).not.toContain('shared/schemas/schema');
  });
});
