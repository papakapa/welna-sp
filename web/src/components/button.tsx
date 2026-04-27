import type { ReactNode } from 'react';

interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  onClick: () => void;
  children: ReactNode;
}

const getVariantClass = (variant: ButtonProps['variant']) => {
  switch (variant) {
    case 'primary':
      return 'bg-white text-neutral-950';
    case 'secondary':
      return 'border border-neutral-700 text-neutral-200';
    case 'danger':
      return 'border border-red-900 text-red-300';
    default:
      return '';
  }
}

export const Button = ({ variant, children, onClick}: ButtonProps) => {
  const cls = `rounded-xl px-5 py-3 font-semibold ${getVariantClass(variant)} cursor-pointer`;
  return (
    <button
      className={cls}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
