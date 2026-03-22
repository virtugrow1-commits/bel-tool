import cliqmakersLogo from '@/assets/cliqmakers-logo.png';

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <img
      src={cliqmakersLogo}
      alt="CliqMakers"
      width={size}
      height={size}
      style={{ objectFit: 'contain' }}
    />
  );
}
