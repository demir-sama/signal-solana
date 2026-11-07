// @vitest-environment jsdom
import{it,expect,vi,afterEach}from'vitest';
vi.hoisted(async()=>{const{Buffer}=await import('node:buffer');globalThis.Uint8Array=Object.getPrototypeOf(Buffer.prototype).constructor});
vi.mock('../src/features',()=>({WALLET_CONNECTION_ENABLED:false,TRANSACTION_SIGNING_ENABLED:false}));
import{render,screen,cleanup,fireEvent}from'@testing-library/react';
import App from'../src/App';
import{authorizeAndBroadcast}from'../src/signing';
import{rpc}from'../src/rpc';
import{parseTransaction,fixture}from'../src/engine';
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
it('independent disabled release switches fail closed in UI when deliberately switched off',()=>{render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Inspect yours'}));fireEvent.change(screen.getByLabelText(/Serialized transaction/),{target:{value:fixture('payment')}});fireEvent.click(screen.getByRole('button',{name:'Decode transaction'}));expect((screen.getByRole('button',{name:'Connect wallet'})as HTMLButtonElement).disabled).toBe(true);expect((screen.getByRole('button',{name:/Review & sign/})as HTMLButtonElement).disabled).toBe(true)});
it('a disabled signing switch blocks direct signing-module imports before wallet or network access',async()=>{const network=vi.fn(),sign=vi.fn();vi.stubGlobal('fetch',network);await expect(authorizeAndBroadcast({analysis:parseTransaction(fixture('payment')),simulation:null,wallet:{signTransaction:sign},fixture:false,confirmed:true})).rejects.toThrow(/signing is disabled/);expect(sign).not.toHaveBeenCalled();expect(network).not.toHaveBeenCalled()});
it('a disabled signing switch also blocks direct client RPC broadcasts',async()=>{const network=vi.fn();vi.stubGlobal('fetch',network);await expect(rpc('sendTransaction',['unsigned-not-sent'])).rejects.toThrow(/broadcasting is disabled/);expect(network).not.toHaveBeenCalled()});
