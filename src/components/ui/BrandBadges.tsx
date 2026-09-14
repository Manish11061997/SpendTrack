import React from 'react';

interface BrandBadgeProps {
  title: string;
  category?: string;
  className?: string;
}

interface BrandDefinition {
  name: string;
  bg: string;
  border: string;
  text: string;
  shadow: string;
  icon: React.ReactNode;
}

export const getBrandDetails = (title: string = '', category: string = ''): BrandDefinition | null => {
  const t = title.toLowerCase();
  const c = category.toLowerCase();

  if (t.includes('swiggy')) {
    return {
      name: 'Swiggy',
      bg: 'bg-orange-500/15',
      border: 'border-orange-500/30',
      text: 'text-orange-400',
      shadow: 'shadow-[0_0_12px_rgba(249,115,22,0.25)]',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
        </svg>
      )
    };
  }

  if (t.includes('zomato')) {
    return {
      name: 'Zomato',
      bg: 'bg-red-500/15',
      border: 'border-red-500/30',
      text: 'text-red-400',
      shadow: 'shadow-[0_0_12px_rgba(239,68,68,0.25)]',
      icon: <span className="font-black italic text-xs tracking-tighter">zom</span>
    };
  }

  if (t.includes('amazon') || t.includes('aws')) {
    return {
      name: 'Amazon',
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      shadow: 'shadow-[0_0_12px_rgba(245,158,11,0.25)]',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M13.8 15.6c-2.3 1.7-5.5 2.6-8.3 2.6-4 0-7.5-1.5-10.2-4-.2-.2 0-.5.2-.3 2.8 1.6 6.3 2.6 9.9 2.6 2.5 0 5.4-.6 8-1.8.4-.2.7.2.4.9zm1.3-.9c-.3-.4-1.9-.2-2.7-.1-.2 0-.3-.2-.1-.3 1-.8 2.7-.6 3-.2.3.4.1 2.1-.8 2.9-.2.1-.3 0-.3-.1.2-.6.7-1.8.9-2.2z" />
        </svg>
      )
    };
  }

  if (t.includes('uber')) {
    return {
      name: 'Uber',
      bg: 'bg-zinc-800',
      border: 'border-zinc-700',
      text: 'text-white',
      shadow: 'shadow-[0_0_12px_rgba(255,255,255,0.1)]',
      icon: <span className="font-black text-xs tracking-tighter">UBER</span>
    };
  }

  if (t.includes('ola')) {
    return {
      name: 'Ola',
      bg: 'bg-lime-500/15',
      border: 'border-lime-500/30',
      text: 'text-lime-400',
      shadow: 'shadow-[0_0_12px_rgba(132,204,22,0.25)]',
      icon: <span className="font-black text-xs">OLA</span>
    };
  }

  if (t.includes('netflix')) {
    return {
      name: 'Netflix',
      bg: 'bg-red-600/15',
      border: 'border-red-600/30',
      text: 'text-red-500',
      shadow: 'shadow-[0_0_12px_rgba(220,38,38,0.3)]',
      icon: <span className="font-black text-sm">N</span>
    };
  }

  if (t.includes('spotify')) {
    return {
      name: 'Spotify',
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      shadow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]',
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M12 2C6.4 2 2 6.4 2 12s4.4 10 10 10 10-4.4 10-10S17.6 2 12 2zm4.6 14.4c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.9-9.3-1-.4.1-.7-.2-.8-.5-.1-.4.2-.7.5-.8 4.1-.9 7.6-.5 10.3 1.2.3.2.4.6.2.9zm1.2-2.7c-.2.4-.7.5-1.1.3-2.9-1.8-7.3-2.3-10.7-1.3-.4.1-.9-.1-1-.6-.1-.4.1-.9.6-1 3.9-1.2 8.8-.6 12 1.4.4.2.5.7.2 1.2zm.1-2.9C14.4 8.7 8.5 8.5 5.1 9.5c-.5.2-1.1-.1-1.3-.6-.2-.5.1-1.1.6-1.3 4-1.2 10.6-1 14.7 1.4.5.3.6.9.3 1.4-.2.5-.8.6-1.5.4z" />
        </svg>
      )
    };
  }

  if (t.includes('starbucks') || t.includes('coffee') || t.includes('chai') || t.includes('tea') || t.includes('cafe')) {
    return {
      name: 'Coffee',
      bg: 'bg-amber-800/15',
      border: 'border-amber-700/30',
      text: 'text-amber-300',
      shadow: 'shadow-[0_0_12px_rgba(217,119,6,0.2)]',
      icon: <span className="text-sm">☕</span>
    };
  }

  if (t.includes('blinkit') || t.includes('zepto') || t.includes('instamart') || t.includes('grocery')) {
    return {
      name: 'Quick Grocery',
      bg: 'bg-yellow-500/15',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      shadow: 'shadow-[0_0_12px_rgba(234,179,8,0.25)]',
      icon: <span className="text-sm">⚡</span>
    };
  }

  if (t.includes('apple') || t.includes('icloud') || t.includes('app store')) {
    return {
      name: 'Apple',
      bg: 'bg-slate-700/20',
      border: 'border-slate-600/30',
      text: 'text-slate-200',
      shadow: 'shadow-[0_0_12px_rgba(148,163,184,0.2)]',
      icon: <span className="text-sm font-black"></span>
    };
  }

  if (t.includes('h&m') || t.includes('hm') || t.includes('zara') || t.includes('apparel') || t.includes('clothing') || t.includes('myntra')) {
    return {
      name: 'H&M',
      bg: 'bg-red-700/15',
      border: 'border-red-600/30',
      text: 'text-red-400',
      shadow: 'shadow-[0_0_12px_rgba(220,38,38,0.25)]',
      icon: <span className="font-black italic text-xs tracking-tighter">H&M</span>
    };
  }

  if (t.includes('salary') || t.includes('payroll') || t.includes('bonus') || c.includes('salary')) {
    return {
      name: 'Salary',
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-500/40',
      text: 'text-emerald-300',
      shadow: 'shadow-[0_0_14px_rgba(16,185,129,0.35)]',
      icon: <span className="text-sm">💰</span>
    };
  }

  return null;
};

export const BrandBadge: React.FC<BrandBadgeProps> = ({ title, category = '', className = '' }) => {
  const brand = getBrandDetails(title, category);
  if (!brand) return null;

  return (
    <div
      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${brand.bg} ${brand.border} ${brand.text} ${brand.shadow} ${className}`}
      title={brand.name}
    >
      {brand.icon}
    </div>
  );
};
