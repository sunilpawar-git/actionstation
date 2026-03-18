import { useAuthStore } from '@/features/auth/stores/authStore';
import { signOut } from '@/features/auth/services/authService';
import { strings } from '@/shared/localization/strings';
import { SettingsIcon } from '@/shared/components/icons';
import {
    SB_FOOTER, SB_FOOTER_STYLE,
    SB_FOOTER_CONTENT, SB_FOOTER_CONTENT_STYLE,
    SB_USER_SECTION, SB_USER_SECTION_STYLE,
    SB_AVATAR, SB_AVATAR_PLACEHOLDER, SB_AVATAR_PLACEHOLDER_STYLE, SB_USER_INFO,
    SB_USER_NAME, SB_USER_NAME_STYLE, SB_SIGN_OUT_BTN, SB_SIGN_OUT_BTN_STYLE, SB_SETTINGS_BTN,
} from '@/shared/components/sidebarStyles';

interface SidebarFooterProps {
    onSettingsClick?: () => void;
}

export function SidebarFooter({ onSettingsClick }: SidebarFooterProps) {
    const user = useAuthStore((s) => s.user);

    if (!user) return null;

    const handleSignOut = async () => {
        try {
            await signOut();
        } catch {
            // Error handled in service
        }
    };

    return (
        <div className={SB_FOOTER} style={SB_FOOTER_STYLE}>
            <div className={SB_FOOTER_CONTENT} style={SB_FOOTER_CONTENT_STYLE}>
                <div className={SB_USER_SECTION} style={SB_USER_SECTION_STYLE}>
                    {user.avatarUrl ? (
                        <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className={SB_AVATAR}
                        />
                    ) : (
                        <div className={SB_AVATAR_PLACEHOLDER} style={SB_AVATAR_PLACEHOLDER_STYLE}>
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className={SB_USER_INFO}>
                        <span className={SB_USER_NAME} style={SB_USER_NAME_STYLE}>{user.name}</span>
                        <button
                            className={SB_SIGN_OUT_BTN}
                            style={SB_SIGN_OUT_BTN_STYLE}
                            onClick={handleSignOut}
                        >
                            {strings.auth.signOut}
                        </button>
                    </div>
                </div>
                <button
                    className={SB_SETTINGS_BTN}
                    onClick={onSettingsClick}
                    aria-label={strings.settings.title}
                >
                    <SettingsIcon size={20} />
                </button>
            </div>
        </div>
    );
}
