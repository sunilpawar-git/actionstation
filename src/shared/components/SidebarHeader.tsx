import { strings } from '@/shared/localization/strings';
import { PinIcon } from '@/shared/components/icons';
import { SB_HEADER, SB_HEADER_STYLE, SB_LOGO, SB_APP_NAME, SB_APP_NAME_STYLE, SB_PIN_TOGGLE } from './sidebarStyles';

interface SidebarHeaderProps {
    isPinned: boolean;
    isHoverOpen: boolean;
    onTogglePin: () => void;
}

export function SidebarHeader({ isPinned, isHoverOpen, onTogglePin }: SidebarHeaderProps) {
    return (
        <div className={SB_HEADER} style={SB_HEADER_STYLE}>
            <div className={SB_LOGO}>
                <svg
                    width="32"
                    height="32"
                    viewBox="0 0 48 48"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <circle cx="24" cy="24" r="20" fill="var(--color-primary)" />
                    <path
                        d="M16 24L22 30L32 18"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
            <span className={SB_APP_NAME} style={SB_APP_NAME_STYLE}>{strings.app.name}</span>
            <button
                className={SB_PIN_TOGGLE}
                onClick={onTogglePin}
                aria-label={isPinned ? strings.sidebar.unpin : strings.sidebar.pin}
                aria-pressed={isPinned}
                aria-expanded={isPinned || isHoverOpen}
                title={isPinned ? strings.sidebar.unpinTooltip : strings.sidebar.pinTooltip}
            >
                <PinIcon size={16} filled={isPinned} />
            </button>
        </div>
    );
}
