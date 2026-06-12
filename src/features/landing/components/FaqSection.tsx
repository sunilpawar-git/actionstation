/**
 * FaqSection — Accordion FAQ for the landing page.
 * Single-open: opening one item closes the previously open one.
 * Uses useState, no Zustand.
 */
import { useState } from 'react';
import { strings } from '@/shared/localization/strings';
import { FaqItem } from './FaqItem';

/** FAQ accordion section with single-open behavior. */
export function FaqSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const handleToggle = (index: number) => {
        setOpenIndex((prev) => (prev === index ? null : index));
    };

    return (
        <section
            id="faq"
            className="w-full max-w-3xl"
            style={{ padding: 'var(--space-2xl) var(--space-xl)', marginLeft: 'auto', marginRight: 'auto' }}
        >
            <h2
                className="font-bold text-center text-[var(--color-text-primary)]"
                style={{
                    fontSize: 'var(--font-size-xl)',
                    marginBottom: 'var(--space-2xl)',
                }}
            >
                {strings.landing.faq.sectionTitle}
            </h2>
            <div>
                {strings.landing.faq.items.map((item, faqIdx) => (
                    <FaqItem
                        key={item.question}
                        question={item.question}
                        answer={item.answer}
                        isOpen={openIndex === faqIdx}
                        onToggle={() => handleToggle(faqIdx)}
                    />
                ))}
            </div>
        </section>
    );
}
