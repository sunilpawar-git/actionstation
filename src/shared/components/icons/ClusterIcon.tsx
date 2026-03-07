/** Cluster Icon — represents AI-powered theme detection */
interface ClusterIconProps {
    size?: number;
    className?: string;
}

export function ClusterIcon({ size = 24, className }: ClusterIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
            focusable="false"
        >
            <circle cx="8" cy="8" r="3" />
            <circle cx="16" cy="8" r="3" />
            <circle cx="12" cy="16" r="3" />
            <path d="M10.5 9.5L11 14" />
            <path d="M13.5 9.5L13 14" />
        </svg>
    );
}
