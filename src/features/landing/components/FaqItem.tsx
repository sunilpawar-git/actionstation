/**
 * FaqItem — Single FAQ accordion item with toggle.
 * Controlled component: parent manages open/closed state.
 */
import { memo, useId } from 'react';

interface FaqItemProps {
    readonly question: string;
    readonly answer: string;
    readonly isOpen: boolean;
    readonly onToggle: () => void;
}

/** Single FAQ accordion item with accessible toggle. */
const FaqItemBase = function FaqItem({ question, answer, isOpen, onToggle }: FaqItemProps) {
    const answerId = useId();

    return (
        <div
            className="border-b border-[var(--color-border)]"
            style={{ padding: 'var(--space-md) 0' }}
        >
            <button
                type="button"
                className="flex items-center justify-between w-full text-left text-[var(--color-text-primary)] cursor-pointer"
                style={{
                    fontSize: 'var(--font-size-base)',
                    fontWeight: 500,
                    background: 'none',
                    border: 'none',
                    padding: 0,
                }}
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={onToggle}
            >
                <span>{question}</span>
                <span
                    className="text-[var(--color-text-muted)] transition-transform duration-200"
                    style={{
                        transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                        fontSize: 'var(--font-size-lg)',
                    }}
                    aria-hidden="true"
                >
                    +
                </span>
            </button>
            {/* Always rendered so aria-controls has a valid DOM target */}
            <p
                id={answerId}
                role="region"
                hidden={!isOpen}
                className="text-[var(--color-text-secondary)]"
                style={{
                    fontSize: 'var(--font-size-sm)',
                    lineHeight: 1.6,
                    marginTop: 'var(--space-sm)',
                }}
            >
                {answer}
            </p>
        </div>
    );
};

export const FaqItem = memo(FaqItemBase);
