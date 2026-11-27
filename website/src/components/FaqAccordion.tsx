import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export const FaqAccordion: React.FC<FaqAccordionProps> = ({ items }) => {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className="card"
            style={{ padding: 0, overflow: 'hidden' }}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${item.id}`}
              id={`faq-trigger-${item.id}`}
              onClick={() => setOpenId(isOpen ? null : item.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '1.1rem 1.25rem',
                background: 'transparent',
                border: 0,
                textAlign: 'left',
                fontWeight: 600,
                fontSize: 'var(--text-base)',
                color: 'var(--text-primary)',
              }}
            >
              <span>{item.question}</span>
              <ChevronDown
                size={18}
                aria-hidden="true"
                style={{
                  flexShrink: 0,
                  color: 'var(--text-muted)',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform var(--duration-fast) var(--ease-out)',
                }}
              />
            </button>
            {isOpen && (
              <div
                id={`faq-panel-${item.id}`}
                role="region"
                aria-labelledby={`faq-trigger-${item.id}`}
                style={{
                  padding: '0 1.25rem 1.15rem',
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--text-sm)',
                  lineHeight: 1.65,
                }}
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
