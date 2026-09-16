import { V3MatchScreen } from './screens/V3MatchScreen';

const DEFAULT_V3_SEED = 73;
const MAX_UINT32 = 0xffffffff;

function isLocalDiagnosticHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function getV3RouteSeed(hostname: string, search: string): number {
  if (!isLocalDiagnosticHost(hostname)) return DEFAULT_V3_SEED;
  const raw = new URLSearchParams(search).get('v3seed');
  if (raw === null || raw.trim() === '') return DEFAULT_V3_SEED;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > MAX_UINT32) return DEFAULT_V3_SEED;
  return value;
}

export function App() {
  const seed =
    typeof window === 'undefined'
      ? DEFAULT_V3_SEED
      : getV3RouteSeed(window.location.hostname, window.location.search);
  return <V3MatchScreen seed={seed} />;
}