import { it,expect } from 'vitest';
import { checkGeneratedExplanation,explanationMessages } from '../src/ai-policy';
it('withholds numeric inventions rather than showing them as grounded AI',()=>expect(checkGeneratedExplanation('Send 0.002 SOL.','Send 0.001 SOL.')).toMatch(/withheld/));
it('withholds unsupported safety language',()=>expect(checkGeneratedExplanation('This is safe.','A transfer was requested.')).toMatch(/safety/));
it('retains a grounded generated explanation',()=>expect(checkGeneratedExplanation('This requests 0.001 SOL, not proof of completion.','A transfer of 0.001 SOL is requested.')).toBeNull());
it('keeps actual evidence in the final inference prompt',()=>expect(explanationMessages('Simulation has not run.').at(-1)?.content).toContain('Simulation has not run.'));

it('withholds invented asset names',()=>expect(checkGeneratedExplanation('Send SOL from Solana DOT.','Transfer SOL on Solana devnet.')).toMatch(/asset name/));
